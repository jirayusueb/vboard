/**
 * Loro document registry — manages in-memory LoroSharedDoc instances.
 * Implements ILoroDocRegistry port for dependency injection.
 *
 * Uses Loro CRDT for conflict-free collaborative editing.
 * Wire protocol: first byte is message type (0=sync, 1=ephemeral), rest is payload.
 *
 * Broadcast strategy:
 * When we import a remote update from client A, we broadcast it to all
 * OTHER clients (B, C, …). We track the version before import, import
 * the update, then export the delta and send it to all peers except the sender.
 */
import { LoroDoc, type VersionVector, VersionVector as VV } from "loro-crdt";

// Lightweight structured logger — avoids external dependency.
// Uses console methods so logs appear in the server's structured output.
const log = {
	info: (msg: string, meta?: Record<string, unknown>) => console.info(`[loro-registry] ${msg}`, meta ?? ""),
	warn: (msg: string, meta?: Record<string, unknown>) => console.warn(`[loro-registry] ${msg}`, meta ?? ""),
	error: (msg: string, meta?: Record<string, unknown>) => console.error(`[loro-registry] ${msg}`, meta ?? ""),
} as const;
import type {
	ILoroDocRegistry,
	WSConn,
} from "../application/ports/i-loro-doc-registry.port";
import type { ICollabSnapshotRepository } from "../application/ports/i-collab-snapshot.repository";

// ── Wire Protocol Constants ─────────────────────────────────
const MESSAGE_SYNC = 0;

// ── Rate Limiting Constants ─────────────────────────────────
const MAX_MESSAGE_SIZE = 256 * 1024; // 256 KiB (matches Loro protocol)
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_MESSAGES = 60; // per second per connection


// ── Doc Eviction Constants ─────────────────────────────────
const EVICT_AFTER_LAST_DISCONNECT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_DOCS_IN_MEMORY = 100;

// ── Close Codes ─────────────────────────────────────────────
const CLOSE_NORMAL = 1000;
const CLOSE_MESSAGE_TOO_LARGE = 4001;
const CLOSE_RATE_LIMITED = 4413;

// ── Rate Limiter ─────────────────────────────────────────────

class PerConnectionRateLimit {
	private timestamps: number[] = [];
	private violations = 0;

	/**
	 * Check if a message should be allowed.
	 * Returns `true` if the message is within rate limits.
	 * After repeated violations, the caller should close the connection.
	 */
	allow(): boolean {
		const now = Date.now();
		const cutoff = now - RATE_LIMIT_WINDOW_MS;
		this.timestamps = this.timestamps.filter((t) => t > cutoff);
		this.timestamps.push(now);

		if (this.timestamps.length > RATE_LIMIT_MAX_MESSAGES) {
			this.violations += 1;
			// Allow up to 3 consecutive violations before enforcing
			return this.violations <= 3;
		}

		// Reset violations on a clean window
		this.violations = 0;
		return true;
	}

	get isAbusing(): boolean {
		return this.violations > 3;
	}
}

/**
 * LoroSharedDoc — wraps a LoroDoc with connection tracking and broadcasting.
 */
export class LoroSharedDoc {
	readonly doc: LoroDoc;
	readonly name: string;
	readonly conns: Map<WSConn, Set<number>> = new Map();
	readonly snapshotRepo: ICollabSnapshotRepository;
	/** Resolves when the initial snapshot has been loaded from the DB (or immediately if none exists). */
	readonly loaded: Promise<void>;
	lastActiveAt: number = Date.now();

	constructor(
		name: string,
		snapshotRepo: ICollabSnapshotRepository,
	) {
		this.name = name;
		this.snapshotRepo = snapshotRepo;
		this.doc = new LoroDoc();
		this.doc.setPeerId("0"); // Server peer ID is deterministic for debugging

		// Load persisted snapshot — stored as a promise so register() can await it
		this.loaded = this.loadSnapshot();
	}

	private async loadSnapshot() {
		try {
			const data = await this.snapshotRepo.load(this.name);
			if (data) {
				const result = this.doc.import(new Uint8Array(data));
				if (result.pending && Object.keys(result.pending).length > 0) {
					log.warn("Snapshot has pending operations (missing dependencies)", {
						boardId: this.name,
						pending: result.pending,
					});
				}
			}
		} catch (error) {
			log.warn("Failed to load snapshot from DB", {
				boardId: this.name,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Export incremental updates since the given version.
	 * Returns the full snapshot if version is undefined (cold start).
	 */
	exportUpdates(fromVersion?: VersionVector): Uint8Array {
		if (fromVersion) {
			return this.doc.export({ mode: "update", from: fromVersion });
		}
		// For initial sync, send the full snapshot
		return this.doc.export({ mode: "snapshot" });
	}

	get version(): VersionVector {
		return this.doc.version();
	}
}

/**
 * LoroDocRegistry — implements ILoroDocRegistry.
 * Instance-based (no module-level mutable state), injectable, testable.
 */
export class LoroDocRegistry implements ILoroDocRegistry {
	private readonly docs = new Map<string, LoroSharedDoc>();
	private readonly rateLimits = new Map<WSConn, PerConnectionRateLimit>();
	private readonly evictionTimers = new Map<string, ReturnType<typeof setTimeout>>();
	private snapshotTimer: ReturnType<typeof setInterval> | null = null;
	private cleanupTimer: ReturnType<typeof setInterval> | null = null;
	private timerStarted = false;

	constructor(private readonly snapshotRepo: ICollabSnapshotRepository) {}

	/** Cancel a pending eviction timer for a board. */
	private cancelEviction(boardId: string): void {
		const timer = this.evictionTimers.get(boardId);
		if (timer !== undefined) {
			clearTimeout(timer);
			this.evictionTimers.delete(boardId);
		}
	}

	/** Schedule eviction of a board's doc after the TTL expires. */
	private scheduleEviction(boardId: string): void {
		this.cancelEviction(boardId);
		this.evictionTimers.set(boardId, setTimeout(() => {
			this.evictIfIdle(boardId);
		}, EVICT_AFTER_LAST_DISCONNECT_MS));
	}

	/** Evict a board's doc if it has no connections and is past TTL. */
	private evictIfIdle(boardId: string): void {
		const doc = this.docs.get(boardId);
		if (!doc) return;
		if (doc.conns.size > 0) return;

		this.docs.delete(boardId);
		this.evictionTimers.delete(boardId);
		log.info("Evicted idle doc from memory", { boardId });
	}

	/** Enforce max docs in memory. Evicts the least recently used doc. */
	private enforceMaxDocs(): void {
		if (this.docs.size <= MAX_DOCS_IN_MEMORY) return;

		let oldestBoardId: string | null = null;
		let oldestTime = Infinity;
		for (const [boardId, doc] of this.docs) {
			if (doc.conns.size === 0 && doc.lastActiveAt < oldestTime) {
				oldestBoardId = boardId;
				oldestTime = doc.lastActiveAt;
			}
		}

		if (oldestBoardId) {
			this.cancelEviction(oldestBoardId);
			this.docs.delete(oldestBoardId);
			log.info("Evicted LRU doc from memory (max limit)", { boardId: oldestBoardId });
		}
	}

	getDoc(boardId: string): LoroSharedDoc {
		let doc = this.docs.get(boardId);
		if (!doc) {
			doc = new LoroSharedDoc(boardId, this.snapshotRepo);
			this.docs.set(boardId, doc);
			this.enforceMaxDocs();
		}
		return doc;
	}

	private getRateLimiter(conn: WSConn): PerConnectionRateLimit {
		let limiter = this.rateLimits.get(conn);
		if (!limiter) {
			limiter = new PerConnectionRateLimit();
			this.rateLimits.set(conn, limiter);
		}
		return limiter;
	}

	private removeRateLimiter(conn: WSConn): void {
		this.rateLimits.delete(conn);
	}

	async register(boardId: string, conn: WSConn): Promise<void> {
		const doc = this.getDoc(boardId);

		// Cancel any pending eviction timer — board is active again
		this.cancelEviction(boardId);

		// Wait for the DB snapshot to be imported before sending initial sync
		await doc.loaded;

		doc.conns.set(conn, new Set());
		doc.lastActiveAt = Date.now();

		// Send initial sync: full snapshot so the client can hydrate
		const snapshot = doc.exportUpdates();
		const message = new Uint8Array(snapshot.length + 1);
		message[0] = MESSAGE_SYNC;
		message.set(snapshot, 1);
		LoroDocRegistry.send(doc, conn, message);
	}

	handleMessage(
		boardId: string,
		conn: WSConn,
		data: Uint8Array,
		readOnly: boolean,
	): void {
		if (data.length === 0) return;

		const doc = this.getDoc(boardId);

		// ── Rate limiting ─────────────────────────────────────────
		const limiter = this.getRateLimiter(conn);
		if (!limiter.allow()) {
			log.warn("Connection rate limited", { boardId });
			LoroDocRegistry.closeConn(doc, conn, CLOSE_RATE_LIMITED, "Rate limited");
			return;
		}
		if (limiter.isAbusing) {
			log.warn("Connection abusing rate limit, closing", { boardId });
			LoroDocRegistry.closeConn(doc, conn, CLOSE_RATE_LIMITED, "Rate limited");
			return;
		}
		const messageType = data[0];

		switch (messageType) {
			case MESSAGE_SYNC: {
				if (readOnly) return;

				// ── Message size check ────────────────────────────
				if (data.length > MAX_MESSAGE_SIZE) {
					log.warn("Message exceeds max size", {
						boardId,
						size: data.length,
						max: MAX_MESSAGE_SIZE,
					});
					LoroDocRegistry.closeConn(
						doc,
						conn,
						CLOSE_MESSAGE_TOO_LARGE,
						"Message too large",
					);
					return;
				}

				try {
					const payload = data.slice(1);

					// Capture version BEFORE import so we can compute the delta
					const versionBefore = doc.doc.version();

					// Import the remote update into the document
					const importResult = doc.doc.import(payload);
					doc.doc.commit();

					// Check for pending operations (missing dependencies)
					if (importResult.pending && Object.keys(importResult.pending).length > 0) {
						log.info("Import has pending operations (missing dependencies)", {
							boardId,
							pending: importResult.pending,
						});
					}

					// Export the delta since the pre-import version and broadcast
					// to all OTHER connected clients (not the sender).
					const delta = doc.doc.export({
						mode: "update",
						from: versionBefore,
					});

					if (delta.length > 0) {
						const message = new Uint8Array(delta.length + 1);
						message[0] = MESSAGE_SYNC;
						message.set(delta, 1);
						doc.conns.forEach((_, c) => {
							// Don't echo back to the sender
							if (c !== conn) {
								LoroDocRegistry.send(doc, c, message);
							}
						});
					}
				} catch (error) {
					log.error("Failed to import Loro update", {
						boardId,
						error: error instanceof Error ? error.message : String(error),
						payloadSize: data.length,
					});
					// Don't close the connection for a single bad update —
					// the client may recover by sending valid updates
				}

				// Note: snapshot persistence is handled by the periodic timer
				// and on last disconnect. We don't persist on every message
				// to reduce DB write frequency.
				break;
			}
			case 0x02: {
				// Version vector exchange: client sends its current version
				// so server can send incremental updates instead of full snapshot.
				try {
					const vvPayload = data.slice(1);
					if (vvPayload.length > 0) {
						const clientVV = VV.decode(vvPayload);
						const incrementalUpdates = doc.exportUpdates(clientVV);

						// Only send if there are actual updates to share
						if (incrementalUpdates.length > 0) {
							const msg = new Uint8Array(incrementalUpdates.length + 1);
							msg[0] = MESSAGE_SYNC;
							msg.set(incrementalUpdates, 1);
							LoroDocRegistry.send(doc, conn, msg);
						}
					}
				} catch {
					// Version vector decode failed — client will fall back to
					// using the full snapshot already sent in register()
					log.warn("Version vector decode failed", { boardId });
				}
				break;
			}
			default: {
				log.info("Unknown message type", {
					boardId,
					messageType,
				});
				break;
			}
		}
	}

	disconnect(boardId: string, conn: WSConn): void {
		const doc = this.docs.get(boardId);
		if (!doc) return;

		this.removeRateLimiter(conn);
		LoroDocRegistry.closeConn(doc, conn);

		// Schedule eviction if no more connections on this board
		if (doc.conns.size === 0) {
			this.scheduleEviction(boardId);
		}
	}

	startSnapshotTimer(): void {
		if (this.timerStarted) return;
		this.timerStarted = true;

		// Persist active docs every 30s
		this.snapshotTimer = setInterval(() => {
			// Log memory usage metrics
			this.logMemoryStats();

			for (const doc of this.docs.values()) {
				if (doc.conns.size > 0) {
					// Use shallow snapshot for periodic saves — reduces
					// DB payload size by pruning old history
					LoroDocRegistry.persistShallowSnapshot(doc);
				}
			}
		}, 30_000);

		// Cleanup old snapshots every 5 minutes (keep latest 5 per board)
		this.cleanupTimer = setInterval(() => {
			this.cleanupOldSnapshots().catch((error) => {
				log.error("Snapshot cleanup failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}, 5 * 60_000);
	}

	/**
	 * Delete old snapshots from DB, keeping only the latest N per active board.
	 */
	private async cleanupOldSnapshots(keepCount = 5): Promise<void> {
		const activeBoardIds = [...this.docs.keys()];
		if (activeBoardIds.length === 0) return;

		for (const boardId of activeBoardIds) {
			try {
				const deleted = await this.snapshotRepo.cleanupOld(boardId, keepCount);
				if (deleted > 0) {
					log.info("Cleaned up old snapshots", { boardId, deleted });
				}
			} catch (error) {
				log.error("Failed to cleanup snapshots for board", {
					boardId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	/**
	 * Log memory and doc count stats periodically.
	 */
	private logMemoryStats(): void {
		const docCount = this.docs.size;
		const totalConns = [...this.docs.values()].reduce(
			(sum, doc) => sum + doc.conns.size,
			0,
		);

		if (docCount > 0) {
			log.info("LoroDocRegistry stats", {
				docsInMemory: docCount,
				activeConnections: totalConns,
				evictionTimers: this.evictionTimers.size,
			});
		}
	}

	/**
	 * Gracefully shut down: persist all in-memory docs, clear timers.
	 * Called during graceful server shutdown to avoid data loss.
	 */
	async dispose(): Promise<void> {
		// Stop the periodic snapshot timer
		if (this.snapshotTimer) {
			clearInterval(this.snapshotTimer);
			this.snapshotTimer = null;
		}

		// Stop the cleanup timer
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}

		// Clear all eviction timers
		for (const [, timer] of this.evictionTimers) {
			clearTimeout(timer);
		}
		this.evictionTimers.clear();

		// Persist all remaining docs to DB
		const docs = [...this.docs.values()];
		log.info(`Persisting ${docs.length} docs before shutdown`, {
			boardIds: docs.map((d) => d.name),
		});
		await Promise.all(docs.map((doc) => LoroDocRegistry.persistSnapshot(doc)));
		this.docs.clear();

		log.info("All docs persisted, registry disposed");
	}

	// ── Static helpers (pure functions operating on LoroSharedDoc) ──────

	static send(doc: LoroSharedDoc, conn: WSConn, m: Uint8Array) {
		if (conn.readyState !== 1) {
			LoroDocRegistry.closeConn(doc, conn);
			return;
		}
		try {
			conn.send(m);
		} catch {
			LoroDocRegistry.closeConn(doc, conn);
		}
	}

	static closeConn(
		doc: LoroSharedDoc,
		conn: WSConn,
		code = CLOSE_NORMAL,
		reason?: string,
	): void {
		if (doc.conns.has(conn)) {
			doc.conns.delete(conn);
			if (doc.conns.size === 0) {
				// Persist snapshot (fire-and-forget) but keep the doc in memory
				// so the next connecting client reuses it instead of racing the DB.
				LoroDocRegistry.persistSnapshot(doc);
			}
		}
		try {
			conn.close(code, reason);
		} catch {
			// already closed
		}
	}

	static async persistSnapshot(doc: LoroSharedDoc) {
		try {
			const data = doc.doc.export({ mode: "snapshot" });
			await doc.snapshotRepo.save(doc.name, Buffer.from(data));
		} catch (error) {
			log.error("Failed to persist snapshot", {
				boardId: doc.name,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Persist a shallow snapshot — keeps only recent history.
	 * Reduces DB payload size compared to full snapshots.
	 * Used by the periodic timer; full snapshots are used on disconnect.
	 */
	static async persistShallowSnapshot(doc: LoroSharedDoc) {
		try {
			const frontiers = doc.doc.oplogFrontiers();
			const data = doc.doc.export({ mode: "shallow-snapshot", frontiers });
			await doc.snapshotRepo.save(doc.name, Buffer.from(data));
		} catch (error) {
			log.error("Failed to persist shallow snapshot", {
				boardId: doc.name,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}