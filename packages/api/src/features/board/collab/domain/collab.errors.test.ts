import { describe, test, expect } from "vitest";
import {
	CollabBoardNotFoundError,
	CollabAccessDeniedError,
} from "./collab.errors";

describe("CollabBoardNotFoundError", () => {
	test("creates error with boardId", () => {
		const err = new CollabBoardNotFoundError({ boardId: "b1" });
		expect(err._tag).toBe("CollabBoardNotFound");
		expect(err.boardId).toBe("b1");
	});

	test("has _tag", () => {
		const err = new CollabBoardNotFoundError({ boardId: "b1" });
		expect(err._tag).toBe("CollabBoardNotFound");
	});
});

describe("CollabAccessDeniedError", () => {
	test("creates error with boardId and userId", () => {
		const err = new CollabAccessDeniedError({ boardId: "b1", userId: "u1" });
		expect(err._tag).toBe("CollabAccessDenied");
		expect(err.boardId).toBe("b1");
		expect(err.userId).toBe("u1");
	});

	test("creates error with null userId (anonymous)", () => {
		const err = new CollabAccessDeniedError({ boardId: "b1", userId: null });
		expect(err._tag).toBe("CollabAccessDenied");
		expect(err.userId).toBeNull();
	});
});
