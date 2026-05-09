import { describe, test, expect } from "vitest";
import { AccessLevel } from "./access-level.vo";

describe("AccessLevel", () => {
	test("READ_ONLY constant", () => {
		expect(AccessLevel.READ_ONLY).toBe("READ_ONLY");
	});

	test("EDITOR constant", () => {
		expect(AccessLevel.EDITOR).toBe("EDITOR");
	});

	test("fromBoolean returns EDITOR for true", () => {
		expect(AccessLevel.fromBoolean(true)).toBe("EDITOR");
	});

	test("fromBoolean returns READ_ONLY for false", () => {
		expect(AccessLevel.fromBoolean(false)).toBe("READ_ONLY");
	});

	test("isEditor returns true for EDITOR", () => {
		expect(AccessLevel.isEditor("EDITOR")).toBe(true);
	});

	test("isEditor returns false for READ_ONLY", () => {
		expect(AccessLevel.isEditor("READ_ONLY")).toBe(false);
	});
});
