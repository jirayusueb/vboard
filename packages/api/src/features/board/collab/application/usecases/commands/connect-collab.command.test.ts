import { describe, test, expect, beforeEach } from "vitest";
import { ConnectCollabCommand } from "./connect-collab.command";
import type { IBoardAccessChecker } from "../../ports/i-board-access-checker.port";
import type { AccessLevel } from "../../../domain/value-objects/access-level.vo";
import type { CollabError } from "../../../domain/collab.errors";
import { Result } from "better-result";
import {
	CollabBoardNotFoundError,
	CollabAccessDeniedError,
} from "../../../domain/collab.errors";

class MockBoardAccessChecker implements IBoardAccessChecker {
	private result: Result<AccessLevel, CollabError> = Result.ok(
		"EDITOR" as AccessLevel,
	);

	setResult(result: Result<AccessLevel, CollabError>) {
		this.result = result;
	}

	async checkAccess(
		_boardId: string,
		_userId: string | null,
	): Promise<Result<AccessLevel, CollabError>> {
		return this.result;
	}
}

describe("ConnectCollabCommand", () => {
	let accessChecker: MockBoardAccessChecker;
	let command: ConnectCollabCommand;

	beforeEach(() => {
		accessChecker = new MockBoardAccessChecker();
		command = new ConnectCollabCommand(accessChecker);
	});

	test("returns EDITOR access level when granted", async () => {
		accessChecker.setResult(Result.ok("EDITOR" as AccessLevel));
		const result = await command.execute({ boardId: "b1", userId: "u1" });
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().accessLevel).toBe("EDITOR");
	});

	test("returns READ_ONLY access level when granted", async () => {
		accessChecker.setResult(Result.ok("READ_ONLY" as AccessLevel));
		const result = await command.execute({ boardId: "b1", userId: "u1" });
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().accessLevel).toBe("READ_ONLY");
	});

	test("returns CollabBoardNotFoundError when board not found", async () => {
		accessChecker.setResult(
			Result.err(new CollabBoardNotFoundError({ boardId: "b1" })),
		);
		const result = await command.execute({ boardId: "b1", userId: "u1" });
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("CollabBoardNotFound");
	});

	test("returns CollabAccessDeniedError when access denied", async () => {
		accessChecker.setResult(
			Result.err(new CollabAccessDeniedError({ boardId: "b1", userId: null })),
		);
		const result = await command.execute({ boardId: "b1", userId: null });
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("CollabAccessDenied");
	});
});
