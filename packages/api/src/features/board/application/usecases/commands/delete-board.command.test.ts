import { describe, test, expect, beforeEach } from "vitest";
import { DeleteBoardCommand } from "./delete-board.command";
import { MockBoardRepository } from "../../__mocks__/mock-board.repository";
import { BoardEntity } from "../../../domain/entities/board.entity";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../../domain/value-objects/board-visibility.vo";

const now = new Date("2025-01-01");

describe("DeleteBoardCommand", () => {
	let boardRepo: MockBoardRepository;
	let command: DeleteBoardCommand;

	beforeEach(() => {
		boardRepo = new MockBoardRepository();
		command = new DeleteBoardCommand(boardRepo);
	});

	test("deletes board owned by user", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Test",
				BoardVisibilityVO.PRIVATE,
				"user-1",
				now,
				now,
			),
		);
		const result = await command.execute({ boardId: "b1", userId: "user-1" });
		expect(result.isOk()).toBe(true);
		expect(await boardRepo.findById(BoardIdVO.create("b1"))).toBeNull();
	});

	test("returns BoardForbiddenError for non-owner", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Test",
				BoardVisibilityVO.PRIVATE,
				"user-1",
				now,
				now,
			),
		);
		const result = await command.execute({ boardId: "b1", userId: "user-2" });
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardForbidden");
	});

	test("returns BoardNotFoundError for missing board", async () => {
		const result = await command.execute({
			boardId: "missing",
			userId: "user-1",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardNotFound");
	});
});
