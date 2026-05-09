import { useEffect, useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import { ExcalidrawBinding } from "@mizuka-wu/y-excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

interface UseCollabOptions {
	boardId: string;
	readOnly?: boolean;
	serverUrl?: string;
}

interface UseCollabReturn {
	ydoc: Y.Doc | null;
	binding: ExcalidrawBinding | null;
	connected: boolean;
}

/**
 * Hook for real-time collaboration on an Excalidraw board via Yjs + WebSocket.
 *
 * Creates a Y.Doc, connects to the server's collab WebSocket,
 * and sets up the ExcalidrawBinding for bidirectional sync.
 */
export function useCollab({
	boardId,
	readOnly = false,
	serverUrl,
}: UseCollabOptions): UseCollabReturn {
	const [connected, setConnected] = useState(false);
	const [ydoc] = useState(() => new Y.Doc());
	const [binding, setBinding] = useState<ExcalidrawBinding | null>(null);
	const wsRef = useRef<WebSocket | null>(null);

	// Create the binding immediately
	useEffect(() => {
		const b = new ExcalidrawBinding(ydoc);
		setBinding(b);
		return () => {
			b.destroy();
		};
	}, [ydoc]);

	// WebSocket connection
	useEffect(() => {
		const url =
			serverUrl ??
			`${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/collab/${boardId}`;

		const ws = new WebSocket(url);
		ws.binaryType = "arraybuffer";
		wsRef.current = ws;

		ws.addEventListener("open", () => {
			setConnected(true);
		});

		ws.addEventListener("close", () => {
			setConnected(false);
		});

		ws.addEventListener("error", () => {
			setConnected(false);
		});

		ws.addEventListener("message", (event) => {
			const data =
				event.data instanceof ArrayBuffer
					? new Uint8Array(event.data)
					: event.data;
			if (data instanceof Uint8Array) {
				// y-websocket protocol: first byte is message type
				const messageType = data[0];
				if (messageType === 0) {
					// sync message — apply to Y.Doc
					Y.applyUpdate(ydoc, data.slice(1));
				}
				// messageType 1 = awareness — ignored for now (handled by binding)
			}
		});

		// Sync step 1: send our state vector
		ws.addEventListener("open", () => {
			// Send sync step 1 after connection
			const encoder = new Uint8Array([0, 0]); // sync, step1
			ws.send(encoder);
		});

		// Observe Y.Doc updates and send them over WS
		const observer = (update: Uint8Array) => {
			if (ws.readyState === WebSocket.OPEN && !readOnly) {
				const message = new Uint8Array(update.length + 1);
				message[0] = 0; // sync message type
				message.set(update, 1);
				ws.send(message);
			}
		};
		ydoc.on("update", observer);

		return () => {
			ydoc.off("update", observer);
			ws.close();
			wsRef.current = null;
		};
	}, [boardId, readOnly, serverUrl, ydoc]);

	return { ydoc, binding, connected };
}
