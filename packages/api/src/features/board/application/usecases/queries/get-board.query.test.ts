import { describe, test, expect, beforeEach } from "vitest";
import { GetBoardQuery } from "./get-board.query";
import { MockBoardRepository } from "../../__mocks__/mock-board.repository";
import { MockBoardMemberRepository } from "../../__mocks__/mock-board-member.repository";
import { BoardEntity } from "../../../domain/entities/board.entity";
import { BoardMemberEntity } from "../../../domain/entities/board-member.entity";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../../domain/value-objects/board-visibility.vo";
import { MemberRoleVO } from "../../../domain/value-objects/member-role.vo";

const now = new Date("2025-01-01");

describe("GetBoardQuery", () => {
	let boardRepo: MockBoardRepository;
	let memberRepo: MockBoardMemberRepository;
	let query: GetBoardQuery;

	beforeEach(() => {
		boardRepo = new MockBoardRepository();
		memberRepo = new MockBoardMemberRepository();
		query = new GetBoardQuery(boardRepo, memberRepo);
	});

	test("returns public board for anonymous user", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Public Board",
				BoardVisibilityVO.PUBLIC,
				"owner",
				now,
				now,
			),
		);
		const result = await query.execute({ boardId: "b1" });
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().title).toBe("Public Board");
		expect(result.unwrap().role).toBeNull();
	});

	test("returns public board with member role", async () => {
		const boardId = BoardIdVO.create("b1");
		await boardRepo.create(
			BoardEntity.restore(
				boardId,
				"Public Board",
				BoardVisibilityVO.PUBLIC,
				"owner",
				now,
				now,
			),
		);
		await memberRepo.add(
			BoardMemberEntity.restore(
				"m1",
				boardId,
				"user-1",
				MemberRoleVO.EDITOR,
				now,
			),
		);
		const result = await query.execute({ boardId: "b1", userId: "user-1" });
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().role).toBe("editor");
	});

	test("returns private board for member", async () => {
		const boardId = BoardIdVO.create("b1");
		await boardRepo.create(
			BoardEntity.restore(
				boardId,
				"Private Board",
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
				"user-1",
				MemberRoleVO.VIEWER,
				now,
			),
		);
		const result = await query.execute({ boardId: "b1", userId: "user-1" });
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().title).toBe("Private Board");
	});

	test("returns BoardAccessDeniedError for anonymous on private board", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Private Board",
				BoardVisibilityVO.PRIVATE,
				"owner",
				now,
				now,
			),
		);
		const result = await query.execute({ boardId: "b1" });
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardAccessDenied");
	});

	test("returns BoardAccessDeniedError for non-member on private board", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Private Board",
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
		const result = await query.execute({ boardId: "missing" });
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardNotFound");
	});
});
