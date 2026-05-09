import { describe, test, expect, beforeEach } from "vitest";
import { TransferOwnershipCommand } from "./transfer-ownership.command";
import { MockBoardRepository } from "../../__mocks__/mock-board.repository";
import { MockBoardMemberRepository } from "../../__mocks__/mock-board-member.repository";
import { MockUnitOfWork } from "../../__mocks__/mock-unit-of-work";
import { BoardEntity } from "../../../domain/entities/board.entity";
import { BoardMemberEntity } from "../../../domain/entities/board-member.entity";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../../domain/value-objects/board-visibility.vo";
import { MemberRoleVO } from "../../../domain/value-objects/member-role.vo";

const now = new Date("2025-01-01");

describe("TransferOwnershipCommand", () => {
	let boardRepo: MockBoardRepository;
	let memberRepo: MockBoardMemberRepository;
	let command: TransferOwnershipCommand;

	beforeEach(() => {
		boardRepo = new MockBoardRepository();
		memberRepo = new MockBoardMemberRepository();
		command = new TransferOwnershipCommand(
			boardRepo,
			memberRepo,
			new MockUnitOfWork(),
		);
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

	test("transfers ownership to existing member", async () => {
		await seedBoard();
		const result = await command.execute({
			boardId: "b1",
			newOwnerId: "user-2",
			userId: "owner-1",
		});
		expect(result.isOk()).toBe(true);
		const board = (await boardRepo.findById(BoardIdVO.create("b1")))!;
		expect(board.ownerId).toBe("user-2");
		// Target becomes owner
		const target = await memberRepo.findByBoardAndUser(
			BoardIdVO.create("b1"),
			"user-2",
		);
		expect(target?.role).toBe(MemberRoleVO.OWNER);
		// Old owner becomes editor
		const oldOwner = await memberRepo.findByBoardAndUser(
			BoardIdVO.create("b1"),
			"owner-1",
		);
		expect(oldOwner?.role).toBe(MemberRoleVO.EDITOR);
	});

	test("returns BoardForbiddenError for non-owner", async () => {
		await seedBoard();
		const result = await command.execute({
			boardId: "b1",
			newOwnerId: "owner-1",
			userId: "user-2",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardForbidden");
	});

	test("returns BoardForbiddenError when target is not a member", async () => {
		await seedBoard();
		const result = await command.execute({
			boardId: "b1",
			newOwnerId: "user-999",
			userId: "owner-1",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardForbidden");
	});

	test("returns BoardNotFoundError for missing board", async () => {
		const result = await command.execute({
			boardId: "missing",
			newOwnerId: "user-2",
			userId: "owner-1",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardNotFound");
	});
});
