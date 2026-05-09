import { describe, test, expect } from "vitest";
import { BoardIdVO } from "./board-id.vo";

describe("BoardIdVO", () => {
	test("create wraps a string into a branded BoardId", () => {
		const id = BoardIdVO.create("board-123");
		expect(BoardIdVO.unwrap(id)).toBe("board-123");
	});

	test("two BoardIds with same value are equal as strings", () => {
		const a = BoardIdVO.create("board-1");
		const b = BoardIdVO.create("board-1");
		expect(BoardIdVO.unwrap(a)).toBe(BoardIdVO.unwrap(b));
	});

	test("different values are not equal", () => {
		const a = BoardIdVO.create("board-1");
		const b = BoardIdVO.create("board-2");
		expect(BoardIdVO.unwrap(a)).not.toBe(BoardIdVO.unwrap(b));
	});
});
