import { describe, test, expect, beforeEach } from "vitest";
import { RemoveMemberCommand } from "./remove-member.command";
import { MockBoardRepository } from "../../__mocks__/mock-board.repository";
import { MockBoardMemberRepository } from "../../__mocks__/mock-board-member.repository";
import { BoardEntity } from "../../../domain/entities/board.entity";
import { BoardMemberEntity } from "../../../domain/entities/board-member.entity";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../../domain/value-objects/board-visibility.vo";
import { MemberRoleVO } from "../../../domain/value-objects/member-role.vo";

const now = new Date("2025-01-01");

describe("RemoveMemberCommand", () => {
	let boardRepo: MockBoardRepository;
	let memberRepo: MockBoardMemberRepository;
	let command: RemoveMemberCommand;

	beforeEach(() => {
		boardRepo = new MockBoardRepository();
		memberRepo = new MockBoardMemberRepository();
		command = new RemoveMemberCommand(boardRepo, memberRepo);
	});

	async function seedBoard() {
		const boardId = BoardIdVO.create("b1");
		await boardRepo.create(
			BoardEntity.restore(
				boardId,
				"Test",
				BoardVisibilityVO.PRIVATE,
				"owner-1",
				now,
				now,
			),
		);
		await memberRepo.add(
			BoardMemberEntity.restore(
				"m1",
				boardId,
				"owner-1",
				MemberRoleVO.OWNER,
				now,
			),
		);
		await memberRepo.add(
			BoardMemberEntity.restore(
				"m2",
				boardId,
				"user-2",
				MemberRoleVO.EDITOR,
				now,
			),
		);
	}

	test("removes member when called by owner", async () => {
		await seedBoard();
		const result = await command.execute({
			boardId: "b1",
			targetUserId: "user-2",
			userId: "owner-1",
		});
		expect(result.isOk()).toBe(true);
		expect(
			await memberRepo.findByBoardAndUser(BoardIdVO.create("b1"), "user-2"),
		).toBeNull();
	});

	test("returns MemberIsOwnerError when trying to remove owner", async () => {
		await seedBoard();
		const result = await command.execute({
			boardId: "b1",
			targetUserId: "owner-1",
			userId: "owner-1",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("MemberIsOwner");
	});

	test("returns BoardForbiddenError for non-owner caller", async () => {
		await seedBoard();
		const result = await command.execute({
			boardId: "b1",
			targetUserId: "owner-1",
			userId: "user-2",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardForbidden");
	});

	test("returns BoardNotFoundError for missing board", async () => {
		const result = await command.execute({
			boardId: "missing",
			targetUserId: "user-2",
			userId: "owner-1",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardNotFound");
	});
});
