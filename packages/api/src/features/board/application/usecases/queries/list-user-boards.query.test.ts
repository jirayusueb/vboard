import { describe, test, expect, beforeEach } from "vitest";
import { ListUserBoardsQuery } from "./list-user-boards.query";
import { MockBoardRepository } from "../../__mocks__/mock-board.repository";
import { BoardEntity } from "../../../domain/entities/board.entity";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../../domain/value-objects/board-visibility.vo";

const now = new Date("2025-01-01");

describe("ListUserBoardsQuery", () => {
	let boardRepo: MockBoardRepository;
	let query: ListUserBoardsQuery;

	beforeEach(() => {
		boardRepo = new MockBoardRepository();
		query = new ListUserBoardsQuery(boardRepo);
	});

	test("returns empty list when user has no boards", async () => {
		const result = await query.execute({ userId: "user-1" });
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().boards).toHaveLength(0);
	});

	test("returns boards for user", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Board 1",
				BoardVisibilityVO.PUBLIC,
				"user-1",
				now,
				now,
			),
		);
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b2"),
				"Board 2",
				BoardVisibilityVO.PRIVATE,
				"user-1",
				now,
				now,
			),
		);
		const result = await query.execute({ userId: "user-1" });
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().boards).toHaveLength(2);
		expect(result.unwrap().boards[0]!.title).toBe("Board 1");
	});
});
