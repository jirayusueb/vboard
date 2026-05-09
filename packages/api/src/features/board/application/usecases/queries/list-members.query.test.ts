import { describe, test, expect, beforeEach } from "vitest";
import { ListMembersQuery } from "./list-members.query";
import { MockBoardMemberRepository } from "../../__mocks__/mock-board-member.repository";
import { MockBoardRepository } from "../../__mocks__/mock-board.repository";
import { BoardEntity } from "../../../domain/entities/board.entity";
import { BoardMemberEntity } from "../../../domain/entities/board-member.entity";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../../domain/value-objects/board-visibility.vo";
import { MemberRoleVO } from "../../../domain/value-objects/member-role.vo";

const now = new Date("2025-01-01");

describe("ListMembersQuery", () => {
	let memberRepo: MockBoardMemberRepository;
	let boardRepo: MockBoardRepository;
	let query: ListMembersQuery;

	beforeEach(() => {
		memberRepo = new MockBoardMemberRepository();
		boardRepo = new MockBoardRepository();
		query = new ListMembersQuery(memberRepo, boardRepo);
	});

	test("lists members for a board member", async () => {
		const boardId = BoardIdVO.create("b1");
		await boardRepo.create(
			BoardEntity.restore(
				boardId,
				"Test",
				BoardVisibilityVO.PRIVATE,
				"owner",
				now,
				now,
			),
		);
		await memberRepo.add(
			BoardMemberEntity.restore(
				"m1",
				boardId,
				"owner",
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
		const result = await query.execute({ boardId: "b1", userId: "owner" });
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().members).toHaveLength(2);
	});

	test("returns BoardAccessDeniedError for non-member", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Test",
				BoardVisibilityVO.PRIVATE,
				"owner",
				now,
				now,
			),
		);
		const result = await query.execute({ boardId: "b1", userId: "stranger" });
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardAccessDenied");
	});

	test("returns BoardNotFoundError for missing board", async () => {
		const result = await query.execute({
			boardId: "missing",
			userId: "user-1",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardNotFound");
	});
});
