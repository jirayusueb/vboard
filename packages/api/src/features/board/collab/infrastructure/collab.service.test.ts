import { beforeEach, describe, expect, test, vi } from "vitest";
import { CollabService } from "./collab.service";
import type { ICollabService } from "../application/ports/i-collab-service.port";
import type { ILoroDocRegistry } from "../application/ports/i-loro-doc-registry.port";
import type { WSContext } from "../application/ports/ws-context.port";
import type { ConnectCollabCommand } from "../application/usecases/commands/connect-collab.command";
import { Result } from "better-result";
import type { AccessLevel } from "../domain/value-objects/access-level.vo";
import { CollabBoardNotFoundError, CollabAccessDeniedError } from "../domain/collab.errors";

// ── Mocks ───────────────────────────────────────────────────────────────

class MockConnectCommand implements ConnectCollabCommand {
	private result: Result<{ accessLevel: AccessLevel }, CollabBoardNotFoundError | CollabAccessDeniedError>;

	constructor(
		result: Result<
			{ accessLevel: AccessLevel },
			CollabBoardNotFoundError | CollabAccessDeniedError
		>,
	) {
		this.result = result;
	}

	async execute() {
		return this.result;
	}
}

class MockLoroDocRegistry implements ILoroDocRegistry {
	register = vi.fn().mockResolvedValue(undefined);
	handleMessage = vi.fn();
	disconnect = vi.fn();
	startSnapshotTimer = vi.fn();
}

/** Creates a WSContext stub with the given userId. */
function createWSContext(userId: string | null): WSContext {
	return {
		raw: {
			readyState: 1,
			send: vi.fn(),
			close: vi.fn(),
		},
		userId,
		boardMeta: null,
	};
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("CollabService", () => {
	let docRegistry: MockLoroDocRegistry;
	let service: ICollabService;

	beforeEach(() => {
		docRegistry = new MockLoroDocRegistry();
	});

	describe("start", () => {
		test("starts the snapshot timer once", () => {
			service = new CollabService(
				new MockConnectCommand(Result.ok({ accessLevel: "EDITOR" })),
				docRegistry,
			);
			service.start();
			service.start(); // idempotent
			expect(docRegistry.startSnapshotTimer).toHaveBeenCalledTimes(1);
		});
	});

	describe("handleConnection", () => {
		test("registers connection and returns EDITOR on success", async () => {
			service = new CollabService(
				new MockConnectCommand(Result.ok({ accessLevel: "EDITOR" })),
				docRegistry,
			);

			const ctx = createWSContext("user-1");
			const result = await service.handleConnection(ctx, "board-1");

			expect(result).toBe("EDITOR");
			expect(docRegistry.register).toHaveBeenCalledWith("board-1", ctx.raw);
			expect(ctx.boardMeta).toEqual({
				boardId: "board-1",
				userId: "user-1",
				connectedAt: expect.any(Date),
				readOnly: false,
			});
		});

		test("registers connection with readOnly=true for READ_ONLY access", async () => {
			service = new CollabService(
				new MockConnectCommand(Result.ok({ accessLevel: "READ_ONLY" })),
				docRegistry,
			);

			const ctx = createWSContext("user-1");
			const result = await service.handleConnection(ctx, "board-1");

			expect(result).toBe("READ_ONLY");
			expect(docRegistry.register).toHaveBeenCalledWith("board-1", ctx.raw);
			expect(ctx.boardMeta?.readOnly).toBe(true);
		});

		test("closes connection and returns null when board not found", async () => {
			service = new CollabService(
				new MockConnectCommand(
					Result.err(new CollabBoardNotFoundError({ boardId: "board-1" })),
				),
				docRegistry,
			);

			const ctx = createWSContext("user-1");
			const result = await service.handleConnection(ctx, "board-1");

			expect(result).toBeNull();
			expect(ctx.raw.close).toHaveBeenCalledWith(
				4403,
				expect.any(String),
			);
			expect(docRegistry.register).not.toHaveBeenCalled();
		});

		test("closes connection and returns null when access denied", async () => {
			service = new CollabService(
				new MockConnectCommand(
					Result.err(
						new CollabAccessDeniedError({ boardId: "board-1", userId: null }),
					),
				),
				docRegistry,
			);

			const ctx = createWSContext(null);
			const result = await service.handleConnection(ctx, "board-1");

			expect(result).toBeNull();
			expect(ctx.raw.close).toHaveBeenCalledWith(
				4403,
				expect.any(String),
			);
			expect(docRegistry.register).not.toHaveBeenCalled();
		});

		test("handles anonymous user (null userId) with EDITOR access", async () => {
			service = new CollabService(
				new MockConnectCommand(Result.ok({ accessLevel: "EDITOR" })),
				docRegistry,
			);

			const ctx = createWSContext(null);
			const result = await service.handleConnection(ctx, "board-1");

			expect(result).toBe("EDITOR");
			expect(ctx.boardMeta?.userId).toBeNull();
		});
	});

	describe("handleMessage", () => {
		test("delegates to docRegistry when boardMeta is set", () => {
			service = new CollabService(
				new MockConnectCommand(Result.ok({ accessLevel: "EDITOR" })),
				docRegistry,
			);

			const ctx = createWSContext("user-1");
			ctx.boardMeta = {
				boardId: "board-1",
				userId: "user-1",
				connectedAt: new Date(),
				readOnly: false,
			};

			const message = new Uint8Array([0, 1, 2, 3]);
			service.handleMessage(ctx, message);

			expect(docRegistry.handleMessage).toHaveBeenCalledWith(
				"board-1",
				ctx.raw,
				message,
				false,
			);
		});

		test("delegates with readOnly=true when boardMeta says so", () => {
			service = new CollabService(
				new MockConnectCommand(Result.ok({ accessLevel: "READ_ONLY" })),
				docRegistry,
			);

			const ctx = createWSContext("user-1");
			ctx.boardMeta = {
				boardId: "board-1",
				userId: "user-1",
				connectedAt: new Date(),
				readOnly: true,
			};

			service.handleMessage(ctx, new Uint8Array([0, 1]));

			expect(docRegistry.handleMessage).toHaveBeenCalledWith(
				"board-1",
				ctx.raw,
				expect.any(Uint8Array),
				true,
			);
		});

		test("is a no-op when boardMeta is null", () => {
			service = new CollabService(
				new MockConnectCommand(Result.ok({ accessLevel: "EDITOR" })),
				docRegistry,
			);

			const ctx = createWSContext("user-1");
			ctx.boardMeta = null;

			service.handleMessage(ctx, new Uint8Array([0, 1, 2]));

			expect(docRegistry.handleMessage).not.toHaveBeenCalled();
		});
	});

	describe("handleDisconnect", () => {
		test("delegates to docRegistry when boardMeta is set", () => {
			service = new CollabService(
				new MockConnectCommand(Result.ok({ accessLevel: "EDITOR" })),
				docRegistry,
			);

			const ctx = createWSContext("user-1");
			ctx.boardMeta = {
				boardId: "board-1",
				userId: "user-1",
				connectedAt: new Date(),
				readOnly: false,
			};

			service.handleDisconnect(ctx);

			expect(docRegistry.disconnect).toHaveBeenCalledWith("board-1", ctx.raw);
		});

		test("is a no-op when boardMeta is null", () => {
			service = new CollabService(
				new MockConnectCommand(Result.ok({ accessLevel: "EDITOR" })),
				docRegistry,
			);

			const ctx = createWSContext("user-1");
			ctx.boardMeta = null;

			service.handleDisconnect(ctx);

			expect(docRegistry.disconnect).not.toHaveBeenCalled();
		});
	});
});
