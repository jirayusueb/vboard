import { beforeEach, describe, expect, test, vi } from "vitest";
import { LoroDocRegistry } from "./loro-doc-registry";
import type {
	ILoroDocRegistry,
	WSConn,
} from "../application/ports/i-loro-doc-registry.port";
import type { ICollabSnapshotRepository } from "../application/ports/i-collab-snapshot.repository";

// ── Helpers ──────────────────────────────────────────────────────────────

/** Creates a fake WSConn that records sent messages. */
function createFakeConn(): WSConn & { sent: Uint8Array[] } {
	const conn = {
		readyState: 1 as const,
		sent: [] as Uint8Array[],
		send(data: Uint8Array) {
			conn.sent.push(data);
		},
		close: vi.fn(),
	};
	return conn;
}

/** Wraps sent binary messages: strips the 1-byte type prefix, returns Loro update bytes. */
function sentUpdates(conn: WSConn & { sent: Uint8Array[] }): Uint8Array[] {
	return conn.sent.map((m) => m.slice(1));
}

/** Creates a valid Loro update message (type 0 + payload). */
function createLoroMessage(): Uint8Array {
	const { LoroDoc } = require("loro-crdt");
	const tmpDoc = new LoroDoc();
	tmpDoc.getList("test").insert(0, new (require("loro-crdt").LoroMap)());
	tmpDoc.commit();
	const loroUpdate = tmpDoc.export({ mode: "update" });
	const message = new Uint8Array(loroUpdate.length + 1);
	message[0] = 0; // sync type
	message.set(new Uint8Array(loroUpdate), 1);
	return message;
}

class InMemorySnapshotRepo implements ICollabSnapshotRepository {
	private store = new Map<string, Buffer>();

	async load(boardId: string): Promise<Buffer | null> {
		return this.store.get(boardId) ?? null;
	}

	async save(boardId: string, data: Buffer): Promise<void> {
		this.store.set(boardId, data);
	}

	async has(boardId: string): Promise<boolean> {
		return this.store.has(boardId);
	}

	async clear(): Promise<void> {
		this.store.clear();
	}
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("LoroDocRegistry", () => {
	let registry: ILoroDocRegistry;
	let snapshotRepo: InMemorySnapshotRepo;

	beforeEach(async () => {
		snapshotRepo = new InMemorySnapshotRepo();
		await snapshotRepo.clear();
		registry = new LoroDocRegistry(snapshotRepo);
	});

	// ── register ──────────────────────────────────────────────────────────

	describe("register", () => {
		test("sends initial snapshot to newly registered connection", async () => {
			const conn = createFakeConn();
			await registry.register("board-1", conn);

			expect(conn.sent.length).toBe(1);
			// First byte = message type 0 (sync), rest is Loro snapshot
			expect(conn.sent[0]![0]).toBe(0);
			// Snapshot should be non-empty (Loro initial state)
			expect(conn.sent[0]!.length).toBeGreaterThan(1);
		});

		test("sends same snapshot to two connections registering on the same board", async () => {
			const conn1 = createFakeConn();
			const conn2 = createFakeConn();

			await registry.register("board-1", conn1);
			await registry.register("board-1", conn2);

			// Both get initial snapshots
			expect(conn1.sent.length).toBe(1);
			expect(conn2.sent.length).toBe(1);
			// The snapshots should be identical
			expect(conn1.sent[0]).toEqual(conn2.sent[0]);
		});

		test("registers on different boards independently", async () => {
			const conn1 = createFakeConn();
			const conn2 = createFakeConn();

			await registry.register("board-a", conn1);
			await registry.register("board-b", conn2);

			expect(conn1.sent.length).toBe(1);
			expect(conn2.sent.length).toBe(1);
		});
	});

	// ── handleMessage (broadcast) ──────────────────────────────────────────

	describe("handleMessage", () => {
		test("broadcasts Loro update from one conn to other conns on same board", async () => {
			const sender = createFakeConn();
			const receiver = createFakeConn();

			await registry.register("board-1", sender);
			await registry.register("board-1", receiver);

			// Clear initial snapshot messages
			sender.sent = [];
			receiver.sent = [];

			const message = createLoroMessage();
			registry.handleMessage("board-1", sender, message, false);

			// Sender should NOT receive echo
			expect(sender.sent.length).toBe(0);

			// Receiver should get the broadcast
			expect(receiver.sent.length).toBe(1);
			expect(receiver.sent[0]![0]).toBe(0); // sync type
			expect(receiver.sent[0]!.length).toBeGreaterThan(1);
		});

		test("does not broadcast from readOnly connection", async () => {
			const readOnlyConn = createFakeConn();
			const otherConn = createFakeConn();

			await registry.register("board-1", readOnlyConn);
			await registry.register("board-1", otherConn);

			readOnlyConn.sent = [];
			otherConn.sent = [];

			// Send a message from the readOnly connection
			const payload = new Uint8Array([0, 1, 2, 3]);
			registry.handleMessage("board-1", readOnlyConn, payload, true);

			// No broadcast to anyone
			expect(readOnlyConn.sent.length).toBe(0);
			expect(otherConn.sent.length).toBe(0);
		});

		test("ignores empty messages", async () => {
			const conn = createFakeConn();
			await registry.register("board-1", conn);
			conn.sent = [];

			registry.handleMessage("board-1", conn, new Uint8Array(0), false);

			expect(conn.sent.length).toBe(0);
		});

		test("ignores unknown message types", async () => {
			const sender = createFakeConn();
			const receiver = createFakeConn();

			await registry.register("board-1", sender);
			await registry.register("board-1", receiver);

			sender.sent = [];
			receiver.sent = [];

			// Message type 99 — unknown
			registry.handleMessage(
				"board-1",
				sender,
				new Uint8Array([99, 1, 2, 3]),
				false,
			);

			expect(sender.sent.length).toBe(0);
			expect(receiver.sent.length).toBe(0);
		});

		test("does not broadcast across different boards", async () => {
			const connA = createFakeConn();
			const connB = createFakeConn();

			await registry.register("board-a", connA);
			await registry.register("board-b", connB);

			connA.sent = [];
			connB.sent = [];

			const message = createLoroMessage();
			registry.handleMessage("board-a", connA, message, false);

			expect(connA.sent.length).toBe(0); // no echo
			expect(connB.sent.length).toBe(0); // different board
		});

		test("handles invalid Loro update gracefully without crashing", async () => {
			const conn = createFakeConn();
			await registry.register("board-1", conn);
			conn.sent = [];

			// Send garbage payload after the sync type byte
			const garbage = new Uint8Array([0, 0xFF, 0xFE, 0xFD, 0xFC]);
			registry.handleMessage("board-1", conn, garbage, false);

			// Should not throw, connection should still be alive
			expect(conn.sent.length).toBe(0);
		});
	});

	// ── Rate Limiting ────────────────────────────────────────────────────

	describe("rate limiting", () => {
		test("allows messages within rate limit", async () => {
			const conn = createFakeConn();
			await registry.register("board-1", conn);
			conn.sent = [];

			const message = createLoroMessage();

			// Send 10 messages rapidly — should all be accepted
			for (let i = 0; i < 10; i++) {
				registry.handleMessage("board-1", conn, message, false);
			}

			// Connection should NOT be closed
			expect(conn.close).not.toHaveBeenCalled();
		});

		test("closes connection when rate limit is exceeded", async () => {
			const conn = createFakeConn();
			await registry.register("board-1", conn);
			conn.sent = [];

			const message = createLoroMessage();

			// Send 100 messages rapidly — should trigger rate limit
			for (let i = 0; i < 100; i++) {
				registry.handleMessage("board-1", conn, message, false);
			}

			// Connection should be closed
			expect(conn.close).toHaveBeenCalled();
		});
	});

	// ── Message Size Limit ───────────────────────────────────────────────

	describe("message size limit", () => {
		test("closes connection when message exceeds 256 KiB", async () => {
			const conn = createFakeConn();
			await registry.register("board-1", conn);
			conn.sent = [];

			// Create a message larger than 256 KiB
			const oversized = new Uint8Array(256 * 1024 + 1);
			oversized[0] = 0; // sync type
			registry.handleMessage("board-1", conn, oversized, false);

			// Connection should be closed
			expect(conn.close).toHaveBeenCalled();
		});

		test("accepts messages under 256 KiB", async () => {
			const conn = createFakeConn();
			await registry.register("board-1", conn);
			conn.sent = [];

			const message = createLoroMessage();
			expect(message.length).toBeLessThan(256 * 1024);
			registry.handleMessage("board-1", conn, message, false);

			// Connection should NOT be closed
			expect(conn.close).not.toHaveBeenCalled();
		});
	});

	// ── disconnect ─────────────────────────────────────────────────────────

	describe("disconnect", () => {
		test("removes connection and stops receiving broadcasts", async () => {
			const conn1 = createFakeConn();
			const conn2 = createFakeConn();

			await registry.register("board-1", conn1);
			await registry.register("board-1", conn2);

			// Disconnect conn1
			registry.disconnect("board-1", conn1);
			expect(conn1.close).toHaveBeenCalled();

			// conn2 is still registered — send from conn2, should not echo
			conn2.sent = [];
			const message = createLoroMessage();
			registry.handleMessage("board-1", conn2, message, false);

			// conn2 should not receive echo
			expect(conn2.sent.length).toBe(0);
		});

		test("disconnecting last connection persists snapshot", async () => {
			const conn = createFakeConn();
			await registry.register("board-1", conn);
			registry.disconnect("board-1", conn);

			// Give the async persist a tick
			await new Promise((r) => setTimeout(r, 50));

			expect(await snapshotRepo.has("board-1")).toBe(true);
		});

		test("disconnecting unknown connection is a no-op", () => {
			const conn = createFakeConn();
			// Never registered — should not throw
			expect(() =>
				registry.disconnect("board-1", conn),
			).not.toThrow();
		});
	});
});
