import { describe, test, expect, beforeEach } from "vitest";
import { GetBoardSnapshotQuery } from "./get-board-snapshot.query";
import { MockBoardSnapshotRepository } from "../../__mocks__/mock-board-snapshot.repository";
import { MockBoardRepository } from "../../__mocks__/mock-board.repository";
import { MockBoardMemberRepository } from "../../__mocks__/mock-board-member.repository";
import { BoardEntity } from "../../../domain/entities/board.entity";
import { BoardMemberEntity } from "../../../domain/entities/board-member.entity";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../../domain/value-objects/board-visibility.vo";
import { MemberRoleVO } from "../../../domain/value-objects/member-role.vo";

const now = new Date("2025-01-01");

describe("GetBoardSnapshotQuery", () => {
	let snapshotRepo: MockBoardSnapshotRepository;
	let boardRepo: MockBoardRepository;
	let memberRepo: MockBoardMemberRepository;
	let query: GetBoardSnapshotQuery;

	beforeEach(() => {
		snapshotRepo = new MockBoardSnapshotRepository();
		boardRepo = new MockBoardRepository();
		memberRepo = new MockBoardMemberRepository();
		query = new GetBoardSnapshotQuery(snapshotRepo, boardRepo, memberRepo);
	});

	test("returns null data when no snapshot exists", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("b1"),
				"Test",
				BoardVisibilityVO.PUBLIC,
				"owner",
				now,
				now,
			),
		);
		const result = await query.execute({ boardId: "b1" });
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().data).toBeNull();
	});

	test("returns snapshot data when exists", async () => {
		const boardId = BoardIdVO.create("b1");
		await boardRepo.create(
			BoardEntity.restore(
				boardId,
				"Test",
				BoardVisibilityVO.PUBLIC,
				"owner",
				now,
				now,
			),
		);
		const data = Buffer.from("snapshot-data");
		await snapshotRepo.save(boardId, data);
		const result = await query.execute({ boardId: "b1" });
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().data).toBe(data);
	});

	test("returns BoardNotFoundError for missing board", async () => {
		const result = await query.execute({ boardId: "missing" });
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardNotFound");
	});

	test("returns BoardAccessDeniedError for non-member on private board", async () => {
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
		const result = await query.execute({ boardId: "b1", userId: "stranger" });
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardAccessDenied");
	});

	test("returns snapshot for member on private board", async () => {
		const boardId = BoardIdVO.create("b1");
		await boardRepo.create(
			BoardEntity.restore(
				boardId,
				"Private",
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
		const data = Buffer.from("snapshot-data");
		await snapshotRepo.save(boardId, data);
		const result = await query.execute({ boardId: "b1", userId: "user-1" });
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().data).toBe(data);
	});
});
