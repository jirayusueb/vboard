/**
 * Yjs document registry — manages in-memory WSSharedDoc instances.
 * Implements IYDocRegistry port for dependency injection.
 *
 * Note: Yjs library APIs use untyped parameters internally.
 * We type what we can and use eslint-disable for genuine external library interop.
 */
import * as Y from "yjs";
import * as sync from "@y/protocols/sync";
import * as awarenessProtocol from "@y/protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import type {
	IYDocRegistry,
	WSConn,
} from "../application/ports/i-ydoc-registry.port";
import type { ICollabSnapshotRepository } from "../application/ports/i-collab-snapshot.repository";

// ── Yjs Protocol Constants ───────────────────────────────────
const messageSync = 0;
const messageAwareness = 1;

export class WSSharedDoc extends Y.Doc {
	name: string;
	conns: Map<WSConn, Set<number>>;
	awareness: awarenessProtocol.Awareness;

	constructor(
		name: string,
		readonly snapshotRepo: ICollabSnapshotRepository,
	) {
		super({ gc: true });
		this.name = name;
		this.conns = new Map();
		this.awareness = new awarenessProtocol.Awareness(this);
		this.awareness.setLocalState(null);

		// Broadcast awareness changes
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Yjs awareness callback types are untyped
		this.awareness.on(
			"update",
			({ added, updated, removed }: any, conn: any) => {
				const changedClients: number[] = added.concat(updated, removed);
				if (conn !== null) {
					const connControlledIDs = this.conns.get(conn);
					if (connControlledIDs !== undefined) {
						added.forEach((clientID: number) =>
							connControlledIDs.add(clientID),
						);
						removed.forEach((clientID: number) =>
							connControlledIDs.delete(clientID),
						);
					}
				}
				const encoder = encoding.createEncoder();
				encoding.writeVarUint(encoder, messageAwareness);
				encoding.writeVarUint8Array(
					encoder,
					awarenessProtocol.encodeAwarenessUpdate(
						this.awareness,
						changedClients,
					),
				);
				const buff = encoding.toUint8Array(encoder);
				this.conns.forEach((_, c) => {
					YjsDocRegistry.send(this, c, buff);
				});
			},
		);

		// Broadcast document updates
		this.on("update", (update: Uint8Array) => {
			const encoder = encoding.createEncoder();
			encoding.writeVarUint(encoder, messageSync);
			sync.writeUpdate(encoder, update);
			const message = encoding.toUint8Array(encoder);
			this.conns.forEach((_, conn) => YjsDocRegistry.send(this, conn, message));
		});

		// Load persisted snapshot
		this.loadSnapshot();
	}

	private async loadSnapshot() {
		try {
			const data = await this.snapshotRepo.load(this.name);
			if (data) {
				Y.applyUpdate(this, data);
			}
		} catch {
			// DB not available yet, that's fine
		}
	}
}

/**
 * YjsDocRegistry — implements IYDocRegistry.
 * Instance-based (no module-level mutable state), injectable, testable.
 */
export class YjsDocRegistry implements IYDocRegistry {
	private readonly docs = new Map<string, WSSharedDoc>();
	private timerStarted = false;

	constructor(private readonly snapshotRepo: ICollabSnapshotRepository) {}

	getDoc(boardId: string): WSSharedDoc {
		let doc = this.docs.get(boardId);
		if (!doc) {
			doc = new WSSharedDoc(boardId, this.snapshotRepo);
			this.docs.set(boardId, doc);
		}
		return doc;
	}

	register(boardId: string, conn: WSConn): void {
		const doc = this.getDoc(boardId);
		doc.conns.set(conn, new Set());

		// Send initial sync step 1 (state vector)
		const encoder = encoding.createEncoder();
		encoding.writeVarUint(encoder, messageSync);
		sync.writeSyncStep1(encoder, doc);
		YjsDocRegistry.send(doc, conn, encoding.toUint8Array(encoder));
	}

	handleMessage(
		boardId: string,
		conn: WSConn,
		data: Uint8Array,
		readOnly: boolean,
	): void {
		const doc = this.getDoc(boardId);
		YjsDocRegistry.messageListener(conn, doc, data, readOnly);
	}

	disconnect(boardId: string, conn: WSConn): void {
		const doc = this.getDoc(boardId);
		YjsDocRegistry.closeConn(doc, conn, this.docs);
	}

	startSnapshotTimer(): void {
		if (this.timerStarted) return;
		this.timerStarted = true;
		setInterval(() => {
			for (const doc of this.docs.values()) {
				if (doc.conns.size > 0) {
					YjsDocRegistry.persistSnapshot(doc);
				}
			}
		}, 60_000);
	}

	// ── Static helpers (pure functions operating on WSSharedDoc) ──────

	static send(doc: WSSharedDoc, conn: WSConn, m: Uint8Array) {
		if (conn.readyState !== 1) {
			YjsDocRegistry.closeConn(doc, conn);
			return;
		}
		try {
			conn.send(m);
		} catch {
			YjsDocRegistry.closeConn(doc, conn);
		}
	}

	static closeConn(
		doc: WSSharedDoc,
		conn: WSConn,
		registry?: Map<string, WSSharedDoc>,
	) {
		if (doc.conns.has(conn)) {
			const controlledIds = doc.conns.get(conn)!;
			doc.conns.delete(conn);
			awarenessProtocol.removeAwarenessStates(
				doc.awareness,
				Array.from(controlledIds),
				null,
			);
			if (doc.conns.size === 0) {
				YjsDocRegistry.persistSnapshot(doc);
				registry?.delete(doc.name);
				doc.destroy();
			}
		}
		try {
			conn.close();
		} catch {
			// already closed
		}
	}

	static async persistSnapshot(doc: WSSharedDoc) {
		try {
			const data = Buffer.from(Y.encodeStateAsUpdate(doc));
			await doc.snapshotRepo.save(doc.name, data);
		} catch {
			// Swallow — snapshot persistence is best-effort
		}
	}

	static messageListener(
		conn: WSConn,
		doc: WSSharedDoc,
		message: Uint8Array,
		readOnly: boolean,
	) {
		try {
			const encoder = encoding.createEncoder();
			const decoder = decoding.createDecoder(message);
			const messageType = decoding.readVarUint(decoder);

			switch (messageType) {
				case messageSync: {
					if (readOnly) return;
					encoding.writeVarUint(encoder, messageSync);
					sync.readSyncMessage(decoder, encoder, doc, conn);
					if (encoding.length(encoder) > 1) {
						YjsDocRegistry.send(doc, conn, encoding.toUint8Array(encoder));
					}
					break;
				}
				case messageAwareness: {
					awarenessProtocol.applyAwarenessUpdate(
						doc.awareness,
						decoding.readVarUint8Array(decoder),
						conn,
					);
					break;
				}
			}
		} catch {
			// Swallow — invalid messages are best-effort
		}
	}
}
