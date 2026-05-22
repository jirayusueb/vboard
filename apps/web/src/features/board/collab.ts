import { useCallback, useEffect, useRef, useState } from "react";
import type { VersionVector } from "loro-crdt";
import { LoroDoc } from "loro-crdt";
import { LoroExcalidrawBinding } from "./loro-excalidraw-binding";
import { env } from "@vboard/env/web";

// ── Connection State Machine ────────────────────────────────────────────

/**
 * Connection lifecycle states exposed to the UI.
 *
 * - `connecting`    — initial load or first connect attempt
 * - `connected`     — WS open and synced
 * - `reconnecting`  — WS closed, retrying with exponential backoff
 * - `disconnected`  — fatal error or intentional close (e.g. component unmount)
 */
type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

interface UseCollabOptions {
	boardId: string;
	readOnly?: boolean;
}

interface UseCollabReturn {
	binding: LoroExcalidrawBinding | null;
	/** Detailed connection state for UI feedback */
	connectionState: ConnectionState;
	/** Simple boolean — true when `connectionState === "connected"` */
	connected: boolean;
	/** Manually retry connection after a fatal disconnect */
	retry: () => void;
}

// ── Reconnection Constants ──────────────────────────────────────────────

const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 15_000;
const JITTER_FACTOR = 0.25;

function backoffDelay(attempt: number): number {
	const exponential = BASE_DELAY_MS * Math.pow(2, Math.min(attempt, 6));
	const capped = Math.min(exponential, MAX_DELAY_MS);
	const jitter = capped * JITTER_FACTOR * (Math.random() * 2 - 1);
	return Math.max(100, Math.round(capped + jitter));
}

// ── Wire Protocol ──────────────────────────────────────────────────────

const MESSAGE_SYNC = 0;

// ── Hook ───────────────────────────────────────────────────────────────

/**
 * Hook for real-time collaboration on an Excalidraw board via Loro CRDT + WebSocket.
 *
 * Creates a LoroDoc, loads the initial snapshot via HTTP, connects to the server's
 * collab WebSocket for live sync, and sets up the LoroExcalidrawBinding.
 *
 * Features:
 * - Exponential backoff reconnection with jitter (500ms → 15s cap)
 * - `navigator.onLine` awareness — pauses retries while offline, resumes on `online`
 * - Connection state machine for UI feedback
 *
 * Wire protocol: first byte is message type (0=sync), rest is Loro update bytes.
 */
const useCollab = ({
	boardId,
	readOnly = false,
}: UseCollabOptions): UseCollabReturn => {
	const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
	const [binding, setBinding] = useState<LoroExcalidrawBinding | null>(null);

	const docRef = useRef<LoroDoc | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const serverVersionRef = useRef<VersionVector | null>(null);
	const unsubscribeRef = useRef<(() => void) | null>(null);

	// Reconnection state (refs to survive across effect re-runs)
	const retryAttemptRef = useRef(0);
	const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mountedRef = useRef(true);
	const intentionalCloseRef = useRef(false);
	const retryFnRef = useRef<() => void>(() => {});
	// Use a ref for connectionState so the handleOnline callback doesn't need it in deps
	const connectionStateRef = useRef<ConnectionState>("connecting");

	// Sync state → ref whenever state changes
	useEffect(() => {
		connectionStateRef.current = connectionState;
	}, [connectionState]);

	// Derived boolean for backwards compat
	const connected = connectionState === "connected";

	// Create the doc and binding once
	useEffect(() => {
		const doc = new LoroDoc();
		docRef.current = doc;
		const b = new LoroExcalidrawBinding(doc);
		setBinding(b);
		return () => {
			b.destroy();
		};
	}, []);

	// Clear any pending retry timer
	const clearRetryTimer = useCallback(() => {
		if (retryTimerRef.current !== null) {
			clearTimeout(retryTimerRef.current);
			retryTimerRef.current = null;
		}
	}, []);

	// Schedule a reconnect attempt with exponential backoff
	const scheduleReconnect = useCallback(() => {
		if (!mountedRef.current || intentionalCloseRef.current) return;
		if (!navigator.onLine) return; // don't schedule while offline

		const delay = backoffDelay(retryAttemptRef.current);
		retryAttemptRef.current += 1;

		retryTimerRef.current = setTimeout(() => {
			if (!mountedRef.current || intentionalCloseRef.current) return;
			if (!navigator.onLine) {
				// Still offline — reschedule
				scheduleReconnect();
				return;
			}
			retryFnRef.current();
		}, delay);
	}, []);

	// ── Main connect effect ──────────────────────────────────────────

	useEffect(() => {
		const doc = docRef.current;
		if (!doc) return;

		// Use VITE_SERVER_URL for API to bypass Vite proxy ECONNRESET issues
		const apiBase = env.VITE_SERVER_URL ?? `${window.location.protocol}//${window.location.host}`;

		let cancelled = false;
		intentionalCloseRef.current = false;

		// 1. Load snapshot via HTTP
		fetch(`${apiBase}/api/board/${boardId}/snapshot`, { credentials: "include" })
			.then(async (res) => {
				if (cancelled || !res.ok) return;
				const buf = await res.arrayBuffer();
				if (cancelled || buf.byteLength === 0) return;
				const importResult = doc.import(new Uint8Array(buf));
				if (importResult.pending && Object.keys(importResult.pending).length > 0) {
					console.warn("[collab] Snapshot has pending operations", importResult.pending);
				}
				serverVersionRef.current = doc.version();
			})
			.catch(() => {
				/* snapshot load is best-effort */
			});

		// 2. Connect WebSocket — use VITE_WS_URL if configured, otherwise derive from VITE_SERVER_URL
		const wsUrl = env.VITE_WS_URL
			?? (() => {
				const base = new URL(env.VITE_SERVER_URL);
				base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
				return `${base.origin}/ws/collab/${boardId}`;
			})();

		function connectWs() {
			if (!mountedRef.current) return;

			const ws = new WebSocket(wsUrl);
			ws.binaryType = "arraybuffer";
			wsRef.current = ws;

			ws.addEventListener("open", () => {
				if (!mountedRef.current) return;
				retryAttemptRef.current = 0;
				setConnectionState("connected");

				// Send version vector for incremental sync on reconnect.
				// Message type 0x02 + Loro-encoded VersionVector bytes.
				// New connections (no serverVersionRef) will get a full snapshot.
				if (serverVersionRef.current) {
					try {
						const vvBytes = serverVersionRef.current.encode();
						const msg = new Uint8Array(1 + vvBytes.length);
						msg[0] = 0x02; // version vector message type
						msg.set(new Uint8Array(vvBytes), 1);
						ws.send(msg);
					} catch {
						// Version vector send is best-effort
					}
				}
			});

			ws.addEventListener("close", () => {
				if (!mountedRef.current) return;
				if (intentionalCloseRef.current) return;

				setConnectionState("reconnecting");
				scheduleReconnect();
			});

			ws.addEventListener("error", () => {
				// `close` fires after `error`, so reconnection is handled there
				// If the connection never opened, ensure we transition away from "connecting"
				if (ws.readyState !== WebSocket.OPEN) {
					setConnectionState("reconnecting");
				}
			});

			ws.addEventListener("message", (event) => {
				const data =
					event.data instanceof ArrayBuffer
						? new Uint8Array(event.data)
						: event.data;
				if (data instanceof Uint8Array && data.length > 0) {
					const [messageType] = data;
					if (messageType === MESSAGE_SYNC) {
						try {
							const payload = data.slice(1);
							const msgResult = doc.import(payload);
						if (msgResult.pending && Object.keys(msgResult.pending).length > 0) {
							console.warn("[collab] Update has pending ops", msgResult.pending);
						}
							serverVersionRef.current = doc.version();
						} catch {
							// Invalid update — log but don't crash
							console.warn("[collab] Failed to import Loro update");
						}
					}
				}
			});
		}

		// Initial connection
		setConnectionState("connecting");
		retryFnRef.current = connectWs;
		connectWs();

		// 3. Subscribe to local updates for WS broadcast (batched)
		// Buffers rapid updates and flushes on a 16ms interval (1 frame)
		// or when buffer exceeds 16 KiB, whichever comes first.
		let updateBuffer: Uint8Array[] = [];
		let flushTimer: ReturnType<typeof setTimeout> | null = null;

		function flushUpdates() {
			const ws = wsRef.current;
			if (ws && ws.readyState === WebSocket.OPEN && updateBuffer.length > 0 && !readOnly) {
				// If there's only one update, send it directly (no allocation)
				if (updateBuffer.length === 1) {
					const msg = new Uint8Array(updateBuffer[0]!.length + 1);
					msg[0] = MESSAGE_SYNC;
					msg.set(updateBuffer[0]!, 1);
					ws.send(msg);
				} else {
					// Merge all buffered updates: commit locally, export the combined delta
					const totalLen = updateBuffer.reduce((sum, u) => sum + u.length + 1, 0);
					const msg = new Uint8Array(totalLen);
					let offset = 0;
					for (const update of updateBuffer) {
						msg[offset] = MESSAGE_SYNC;
						msg.set(update, offset + 1);
						offset += update.length + 1;
					}
					ws.send(msg);
				}
				updateBuffer = [];
			}
			flushTimer = null;
		}

		const unsubscribe = doc.subscribeLocalUpdates((update: Uint8Array) => {
			updateBuffer.push(update);

			// Flush immediately if buffer exceeds 16 KiB
			const totalSize = updateBuffer.reduce((sum, u) => sum + u.length, 0);
			if (totalSize >= 16 * 1024) {
				if (flushTimer !== null) {
					clearTimeout(flushTimer);
					flushTimer = null;
				}
				flushUpdates();
				return;
			}

			// Otherwise, debounce: flush on next animation frame (~16ms)
			if (!flushTimer) {
				flushTimer = setTimeout(flushUpdates, 16);
			}
		});
		unsubscribeRef.current = unsubscribe;

		// 4. Online/offline listeners
		function handleOnline() {
			if (!mountedRef.current) return;
			// If we were reconnecting, immediately try again
			if (connectionStateRef.current === "reconnecting") {
				clearRetryTimer();
				connectWs();
			}
		}

		function handleOffline() {
			if (!mountedRef.current) return;
			clearRetryTimer();
			// Close the WS — the close handler won't schedule retries
			// because navigator.onLine is false
			const ws = wsRef.current;
			if (ws) {
				intentionalCloseRef.current = true;
				ws.close(1000, "Going offline");
				intentionalCloseRef.current = false;
			}
			setConnectionState("reconnecting");
		}

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			cancelled = true;
			intentionalCloseRef.current = true;
			unsubscribe();
			unsubscribeRef.current = null;
			clearRetryTimer();
			const ws = wsRef.current;
			if (ws) {
				ws.close(1000, "Component unmount");
			}
			wsRef.current = null;
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [boardId, readOnly, scheduleReconnect, clearRetryTimer]);

	// Manually retry after fatal disconnect
	const retry = useCallback(() => {
		clearRetryTimer();
		retryAttemptRef.current = 0;
		intentionalCloseRef.current = false;
		retryFnRef.current();
	}, [clearRetryTimer]);

	return { binding, connectionState, connected, retry };
};

export { useCollab };
export type { ConnectionState };
