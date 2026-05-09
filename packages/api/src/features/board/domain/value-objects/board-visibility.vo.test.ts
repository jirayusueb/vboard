import { describe, test, expect } from "vitest";
import { BoardVisibilityVO } from "./board-visibility.vo";

describe("BoardVisibilityVO", () => {
	test("has PUBLIC and PRIVATE static instances", () => {
		expect(BoardVisibilityVO.PUBLIC.value).toBe("public");
		expect(BoardVisibilityVO.PRIVATE.value).toBe("private");
	});

	test("isPublic / isPrivate getters", () => {
		expect(BoardVisibilityVO.PUBLIC.isPublic).toBe(true);
		expect(BoardVisibilityVO.PUBLIC.isPrivate).toBe(false);
		expect(BoardVisibilityVO.PRIVATE.isPublic).toBe(false);
		expect(BoardVisibilityVO.PRIVATE.isPrivate).toBe(true);
	});

	test("fromString returns correct instances", () => {
		expect(BoardVisibilityVO.fromString("public")).toBe(
			BoardVisibilityVO.PUBLIC,
		);
		expect(BoardVisibilityVO.fromString("private")).toBe(
			BoardVisibilityVO.PRIVATE,
		);
	});

	test("fromString throws on invalid string", () => {
		expect(() => BoardVisibilityVO.fromString("secret")).toThrow(
			"Invalid BoardVisibility: secret",
		);
	});

	test("equals compares by value", () => {
		expect(BoardVisibilityVO.PUBLIC.equals(BoardVisibilityVO.PUBLIC)).toBe(
			true,
		);
		expect(BoardVisibilityVO.PUBLIC.equals(BoardVisibilityVO.PRIVATE)).toBe(
			false,
		);
	});

	test("toString returns the value", () => {
		expect(BoardVisibilityVO.PUBLIC.toString()).toBe("public");
	});
});
