import { describe, test, expect, beforeEach } from "vitest";
import { BoardAccessChecker } from "./board-access-checker";
import { MockBoardRepository } from "../../application/__mocks__/mock-board.repository";
import { MockBoardMemberRepository } from "../../application/__mocks__/mock-board-member.repository";
import { BoardEntity } from "../../domain/entities/board.entity";
import { BoardMemberEntity } from "../../domain/entities/board-member.entity";
import { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../domain/value-objects/board-visibility.vo";
import { MemberRoleVO } from "../../domain/value-objects/member-role.vo";

const now = new Date("2025-01-01");

describe("BoardAccessChecker", () => {
	let boardRepo: MockBoardRepository;
	let memberRepo: MockBoardMemberRepository;
	let checker: BoardAccessChecker;

	beforeEach(() => {
		boardRepo = new MockBoardRepository();
		memberRepo = new MockBoardMemberRepository();
		checker = new BoardAccessChecker(boardRepo, memberRepo);
	});

	test("returns CollabBoardNotFoundError for missing board", async () => {
		const result = await checker.checkAccess("missing", "user-1");
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("CollabBoardNotFound");
	});

	test("returns READ_ONLY for anonymous user on public board", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Public",
				BoardVisibilityVO.PUBLIC,
				"owner",
				now,
				now,
			),
		);
		const result = await checker.checkAccess("b1", null);
		expect(result.isOk()).toBe(true);
		expect(result.unwrap()).toBe("READ_ONLY");
	});

	test("returns CollabAccessDeniedError for anonymous user on private board", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Private",
				BoardVisibilityVO.PRIVATE,
				"owner",
				now,
				now,
			),
		);
		const result = await checker.checkAccess("b1", null);
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("CollabAccessDenied");
	});

	test("returns EDITOR for member with edit permission", async () => {
		const boardId = BoardIdVO.create("b1");
		await boardRepo.create(
			BoardEntity.restore(
				boardId,
				"Board",
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
				MemberRoleVO.EDITOR,
				now,
			),
		);
		const result = await checker.checkAccess("b1", "user-1");
		expect(result.isOk()).toBe(true);
		expect(result.unwrap()).toBe("EDITOR");
	});

	test("returns READ_ONLY for member with viewer permission", async () => {
		const boardId = BoardIdVO.create("b1");
		await boardRepo.create(
			BoardEntity.restore(
				boardId,
				"Board",
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
		const result = await checker.checkAccess("b1", "user-1");
		expect(result.isOk()).toBe(true);
		expect(result.unwrap()).toBe("READ_ONLY");
	});

	test("returns CollabAccessDeniedError for non-member on private board", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Private",
				BoardVisibilityVO.PRIVATE,
				"owner",
				now,
				now,
			),
		);
		const result = await checker.checkAccess("b1", "stranger");
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("CollabAccessDenied");
	});

	test("returns READ_ONLY for non-member on public board", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Public",
				BoardVisibilityVO.PUBLIC,
				"owner",
				now,
				now,
			),
		);
		const result = await checker.checkAccess("b1", "stranger");
		expect(result.isOk()).toBe(true);
		expect(result.unwrap()).toBe("READ_ONLY");
	});
});
