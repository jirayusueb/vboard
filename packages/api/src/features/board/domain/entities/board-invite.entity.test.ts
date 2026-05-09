import { describe, test, expect } from "vitest";
import { BoardInviteEntity } from "./board-invite.entity";
import { BoardIdVO } from "../value-objects/board-id.vo";
import { InviteTokenVO } from "../value-objects/invite-token.vo";
import { MemberRoleVO } from "../value-objects/member-role.vo";
import { MockDateProvider } from "../../application/__mocks__/mock-date-provider";

describe("BoardInviteEntity", () => {
	describe("create", () => {
		test("creates invite without expiry", () => {
			const dp = new MockDateProvider();
			const result = BoardInviteEntity.create(
				"inv-1",
				BoardIdVO.create("b1"),
				InviteTokenVO.create("tok-1"),
				MemberRoleVO.EDITOR,
				dp,
			);
			expect(result.isOk()).toBe(true);
			const invite = result.unwrap();
			expect(invite.role).toBe(MemberRoleVO.EDITOR);
			expect(invite.expiresAt).toBeNull();
			expect(invite.createdAt).toBe(dp.now());
		});

		test("creates invite with expiry", () => {
			const dp = new MockDateProvider();
			const result = BoardInviteEntity.create(
				"inv-1",
				BoardIdVO.create("b1"),
				InviteTokenVO.create("tok-1"),
				MemberRoleVO.VIEWER,
				dp,
				60,
			);
			expect(result.isOk()).toBe(true);
			const invite = result.unwrap();
			expect(invite.expiresAt).not.toBeNull();
		});
	});

	describe("restore", () => {
		test("restores invite with all fields", () => {
			const invite = BoardInviteEntity.restore(
				"inv-1",
				BoardIdVO.create("b1"),
				InviteTokenVO.create("tok-1"),
				MemberRoleVO.EDITOR,
				new Date("2025-01-01"),
				null,
			);
			expect(invite.id).toBe("inv-1");
			expect(invite.role).toBe(MemberRoleVO.EDITOR);
		});
	});

	describe("isExpired", () => {
		test("no expiry → not expired", () => {
			const invite = BoardInviteEntity.restore(
				"inv-1",
				BoardIdVO.create("b1"),
				InviteTokenVO.create("tok-1"),
				MemberRoleVO.EDITOR,
				new Date("2025-01-01"),
				null,
			);
			expect(invite.isExpired).toBe(false);
		});

		test("future expiry → not expired", () => {
			const invite = BoardInviteEntity.restore(
				"inv-1",
				BoardIdVO.create("b1"),
				InviteTokenVO.create("tok-1"),
				MemberRoleVO.EDITOR,
				new Date("2025-01-01"),
				new Date("2099-12-31"),
			);
			expect(invite.isExpired).toBe(false);
		});

		test("past expiry → expired", () => {
			const invite = BoardInviteEntity.restore(
				"inv-1",
				BoardIdVO.create("b1"),
				InviteTokenVO.create("tok-1"),
				MemberRoleVO.EDITOR,
				new Date("2024-01-01"),
				new Date("2024-12-31"),
			);
			expect(invite.isExpired).toBe(true);
		});
	});
});
