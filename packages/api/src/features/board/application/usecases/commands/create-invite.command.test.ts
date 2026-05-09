import { describe, test, expect, beforeEach } from "vitest";
import { CreateInviteCommand } from "./create-invite.command";
import { MockBoardRepository } from "../../__mocks__/mock-board.repository";
import { MockBoardInviteRepository } from "../../__mocks__/mock-board-invite.repository";
import { MockIdGenerator } from "../../__mocks__/mock-id-generator";
import { MockDateProvider } from "../../__mocks__/mock-date-provider";
import { BoardEntity } from "../../../domain/entities/board.entity";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../../domain/value-objects/board-visibility.vo";

const now = new Date("2025-01-01");

describe("CreateInviteCommand", () => {
	let boardRepo: MockBoardRepository;
	let inviteRepo: MockBoardInviteRepository;
	let command: CreateInviteCommand;

	beforeEach(() => {
		boardRepo = new MockBoardRepository();
		inviteRepo = new MockBoardInviteRepository();
		command = new CreateInviteCommand(
			boardRepo,
			inviteRepo,
			new MockIdGenerator(),
			new MockDateProvider(),
		);
	});

	test("creates invite for board owner", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("id-1"),
				"Test",
				BoardVisibilityVO.PRIVATE,
				"user-1",
				now,
				now,
			),
		);
		const result = await command.execute({
			boardId: "id-1",
			role: "editor",
			userId: "user-1",
		});
		expect(result.isOk()).toBe(true);
		expect(typeof result.unwrap().token).toBe("string");
	});

	test("returns BoardForbiddenError for non-owner", async () => {
		await boardRepo.create(
			BoardEntity.restore(
				BoardIdVO.create("id-1"),
				"Test",
				BoardVisibilityVO.PRIVATE,
				"user-1",
				now,
				now,
			),
		);
		const result = await command.execute({
			boardId: "id-1",
			role: "editor",
			userId: "user-2",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardForbidden");
	});

	test("returns BoardNotFoundError for missing board", async () => {
		const result = await command.execute({
			boardId: "missing",
			role: "editor",
			userId: "user-1",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("BoardNotFound");
	});
});
