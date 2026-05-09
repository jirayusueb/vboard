import { describe, test, expect } from "vitest";
import { InviteTokenVO } from "./invite-token.vo";

describe("InviteTokenVO", () => {
	test("create wraps a string into a branded InviteToken", () => {
		const token = InviteTokenVO.create("tok-abc");
		expect(token as string).toBe("tok-abc");
	});

	test("two tokens with same value are equal as strings", () => {
		const a = InviteTokenVO.create("tok-1");
		const b = InviteTokenVO.create("tok-1");
		expect(a as string).toBe(b as string);
	});

	test("different tokens are not equal", () => {
		const a = InviteTokenVO.create("tok-1");
		const b = InviteTokenVO.create("tok-2");
		expect(a as string).not.toBe(b as string);
	});
});
