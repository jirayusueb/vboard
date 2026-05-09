import { describe, test, expect, beforeEach } from "vitest";
import { UpdateBoardCommand } from "./update-board.command";
import { MockBoardRepository } from "../../__mocks__/mock-board.repository";
import { MockDateProvider } from "../../__mocks__/mock-date-provider";
import { BoardEntity } from "../../../domain/entities/board.entity";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../../domain/value-objects/board-visibility.vo";

const now = new Date("2025-01-01");

describe("UpdateBoardCommand", () => {
	let boardRepo: MockBoardRepository;
	let command: UpdateBoardCommand;

	beforeEach(() => {
		boardRepo = new MockBoardRepository();
		command = new UpdateBoardCommand(boardRepo, new MockDateProvider());
	});

	async function seedBoard(ownerId = "user-1") {
		const board = BoardEntity.restore(
			BoardIdVO.create("id-1"),
			"Original Title",
			BoardVisibilityVO.PRIVATE,
			ownerId,
			now,
			now,
		);
		await boardRepo.create(board);
		return board;
	}

	test("updates title for owner", async () => {
		await seedBoard();
		const result = await command.execute({
			boardId: "id-1",
			title: "Updated Title",
			userId: "user-1",
		});
		expect(result.isOk()).toBe(true);
		const updated = (await boardRepo.findById(BoardIdVO.create("id-1")))!;
		expect(updated.title).toBe("Updated Title");
	});

	test("updates visibility for owner", async () => {
		await seedBoard();
		const result = await command.execute({
			boardId: "id-1",
			visibility: "public",
			userId: "user-1",
		});
		expect(result.isOk()).toBe(true);
		const updated = (await boardRepo.findById(BoardIdVO.create("id-1")))!;
		expect(updated.visibility).toBe(BoardVisibilityVO.PUBLIC);
	});

	test("returns BoardForbiddenError for non-owner", async () => {
		await seedBoard();
		const result = await command.execute({
			boardId: "id-1",
			title: "Hack",
			userId: "user-2",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardForbidden");
	});

	test("returns BoardNotFoundError for missing board", async () => {
		const result = await command.execute({
			boardId: "nonexistent",
			title: "Test",
			userId: "user-1",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardNotFound");
	});
});
