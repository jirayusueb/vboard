import { describe, test, expect } from "vitest";
import { BoardEntity } from "./board.entity";
import { BoardIdVO } from "../value-objects/board-id.vo";
import { BoardVisibilityVO } from "../value-objects/board-visibility.vo";

const now = new Date("2025-01-01");

describe("BoardEntity", () => {
	describe("create", () => {
		test("creates a valid board", () => {
			const result = BoardEntity.create(
				BoardIdVO.create("b1"),
				"My Board",
				BoardVisibilityVO.PUBLIC,
				"user-1",
				now,
			);
			expect(result.isOk()).toBe(true);
			const board = result.unwrap();
			expect(board.title).toBe("My Board");
			expect(board.visibility).toBe(BoardVisibilityVO.PUBLIC);
			expect(board.ownerId).toBe("user-1");
			expect(board.createdAt).toBe(now);
			expect(board.updatedAt).toBe(now);
		});

		test("trims title whitespace", () => {
			const result = BoardEntity.create(
				BoardIdVO.create("b1"),
				"  Spaced Title  ",
				BoardVisibilityVO.PRIVATE,
				"user-1",
				now,
			);
			expect(result.isOk()).toBe(true);
			expect(result.unwrap().title).toBe("Spaced Title");
		});

		test("rejects empty title", () => {
			const result = BoardEntity.create(
				BoardIdVO.create("b1"),
				"",
				BoardVisibilityVO.PUBLIC,
				"user-1",
				now,
			);
			expect(result.isErr()).toBe(true);
		});

		test("rejects whitespace-only title", () => {
			const result = BoardEntity.create(
				BoardIdVO.create("b1"),
				"   ",
				BoardVisibilityVO.PUBLIC,
				"user-1",
				now,
			);
			expect(result.isErr()).toBe(true);
		});

		test("rejects empty ownerId", () => {
			const result = BoardEntity.create(
				BoardIdVO.create("b1"),
				"Title",
				BoardVisibilityVO.PUBLIC,
				"",
				now,
			);
			expect(result.isErr()).toBe(true);
		});
	});

	describe("restore", () => {
		test("restores without validation", () => {
			const board = BoardEntity.restore(
				BoardIdVO.create("b1"),
				"",
				BoardVisibilityVO.PUBLIC,
				"user-1",
				now,
				now,
			);
			expect(board.title).toBe("");
		});
	});

	describe("isOwnedBy", () => {
		test("returns true for owner", () => {
			const board = BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Test",
				BoardVisibilityVO.PUBLIC,
				"user-1",
				now,
				now,
			);
			expect(board.isOwnedBy("user-1")).toBe(true);
		});

		test("returns false for non-owner", () => {
			const board = BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Test",
				BoardVisibilityVO.PUBLIC,
				"user-1",
				now,
				now,
			);
			expect(board.isOwnedBy("user-2")).toBe(false);
		});
	});

	describe("updateTitle", () => {
		test("updates title and updatedAt", () => {
			const board = BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Old",
				BoardVisibilityVO.PUBLIC,
				"user-1",
				now,
				now,
			);
			const later = new Date("2025-01-02");
			board.updateTitle("New", later);
			expect(board.title).toBe("New");
			expect(board.updatedAt).toBe(later);
		});
	});

	describe("changeVisibility", () => {
		test("changes visibility and updatedAt", () => {
			const board = BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Test",
				BoardVisibilityVO.PUBLIC,
				"user-1",
				now,
				now,
			);
			const later = new Date("2025-01-02");
			board.changeVisibility(BoardVisibilityVO.PRIVATE, later);
			expect(board.visibility).toBe(BoardVisibilityVO.PRIVATE);
			expect(board.updatedAt).toBe(later);
		});
	});
});
