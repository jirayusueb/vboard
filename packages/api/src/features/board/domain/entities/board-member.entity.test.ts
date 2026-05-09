import { describe, test, expect } from "vitest";
import { BoardMemberEntity } from "./board-member.entity";
import { BoardIdVO } from "../value-objects/board-id.vo";
import { MemberRoleVO } from "../value-objects/member-role.vo";

const now = new Date("2025-01-01");

describe("BoardMemberEntity", () => {
	describe("create", () => {
		test("creates a valid member", () => {
			const result = BoardMemberEntity.create(
				"m1",
				BoardIdVO.create("b1"),
				"user-1",
				MemberRoleVO.EDITOR,
				now,
			);
			expect(result.isOk()).toBe(true);
			const member = result.unwrap();
			expect(member.userId).toBe("user-1");
			expect(member.role).toBe(MemberRoleVO.EDITOR);
		});

		test("rejects empty userId", () => {
			const result = BoardMemberEntity.create(
				"m1",
				BoardIdVO.create("b1"),
				"",
				MemberRoleVO.VIEWER,
				now,
			);
			expect(result.isErr()).toBe(true);
		});
	});

	describe("restore", () => {
		test("restores without validation", () => {
			const member = BoardMemberEntity.restore(
				"m1",
				BoardIdVO.create("b1"),
				"user-1",
				MemberRoleVO.OWNER,
				now,
			);
			expect(member.userId).toBe("user-1");
		});
	});

	describe("canEdit / canManage delegation", () => {
		test("owner can edit and manage", () => {
			const member = BoardMemberEntity.restore(
				"m1",
				BoardIdVO.create("b1"),
				"user-1",
				MemberRoleVO.OWNER,
				now,
			);
			expect(member.canEdit).toBe(true);
			expect(member.canManage).toBe(true);
		});

		test("editor can edit but not manage", () => {
			const member = BoardMemberEntity.restore(
				"m1",
				BoardIdVO.create("b1"),
				"user-1",
				MemberRoleVO.EDITOR,
				now,
			);
			expect(member.canEdit).toBe(true);
			expect(member.canManage).toBe(false);
		});

		test("viewer cannot edit or manage", () => {
			const member = BoardMemberEntity.restore(
				"m1",
				BoardIdVO.create("b1"),
				"user-1",
				MemberRoleVO.VIEWER,
				now,
			);
			expect(member.canEdit).toBe(false);
			expect(member.canManage).toBe(false);
		});
	});
});
