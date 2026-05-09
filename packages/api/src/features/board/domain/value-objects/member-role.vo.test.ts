import { describe, test, expect } from "vitest";
import { MemberRoleVO } from "./member-role.vo";

describe("MemberRoleVO", () => {
	test("has OWNER, EDITOR, VIEWER static instances", () => {
		expect(MemberRoleVO.OWNER.value).toBe("owner");
		expect(MemberRoleVO.EDITOR.value).toBe("editor");
		expect(MemberRoleVO.VIEWER.value).toBe("viewer");
	});

	test("canEdit — owner and editor can edit, viewer cannot", () => {
		expect(MemberRoleVO.OWNER.canEdit).toBe(true);
		expect(MemberRoleVO.EDITOR.canEdit).toBe(true);
		expect(MemberRoleVO.VIEWER.canEdit).toBe(false);
	});

	test("canManage — only owner can manage", () => {
		expect(MemberRoleVO.OWNER.canManage).toBe(true);
		expect(MemberRoleVO.EDITOR.canManage).toBe(false);
		expect(MemberRoleVO.VIEWER.canManage).toBe(false);
	});

	test("fromString returns correct instances", () => {
		expect(MemberRoleVO.fromString("owner")).toBe(MemberRoleVO.OWNER);
		expect(MemberRoleVO.fromString("editor")).toBe(MemberRoleVO.EDITOR);
		expect(MemberRoleVO.fromString("viewer")).toBe(MemberRoleVO.VIEWER);
	});

	test("fromString throws on invalid string", () => {
		expect(() => MemberRoleVO.fromString("admin")).toThrow(
			"Invalid MemberRole: admin",
		);
	});

	test("equals compares by value", () => {
		expect(MemberRoleVO.OWNER.equals(MemberRoleVO.OWNER)).toBe(true);
		expect(MemberRoleVO.OWNER.equals(MemberRoleVO.EDITOR)).toBe(false);
	});

	test("toString returns the value", () => {
		expect(MemberRoleVO.OWNER.toString()).toBe("owner");
	});
});
