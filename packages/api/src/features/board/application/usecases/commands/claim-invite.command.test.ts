import { describe, test, expect, beforeEach } from "vitest";
import { ClaimInviteCommand } from "./claim-invite.command";
import { MockBoardInviteRepository } from "../../__mocks__/mock-board-invite.repository";
import { MockBoardMemberRepository } from "../../__mocks__/mock-board-member.repository";
import { MockUnitOfWork } from "../../__mocks__/mock-unit-of-work";
import { MockIdGenerator } from "../../__mocks__/mock-id-generator";
import { MockDateProvider } from "../../__mocks__/mock-date-provider";
import { BoardInviteEntity } from "../../../domain/entities/board-invite.entity";
import { BoardMemberEntity } from "../../../domain/entities/board-member.entity";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { InviteTokenVO } from "../../../domain/value-objects/invite-token.vo";
import { MemberRoleVO } from "../../../domain/value-objects/member-role.vo";

describe("ClaimInviteCommand", () => {
	let inviteRepo: MockBoardInviteRepository;
	let memberRepo: MockBoardMemberRepository;
	let command: ClaimInviteCommand;

	beforeEach(() => {
		inviteRepo = new MockBoardInviteRepository();
		memberRepo = new MockBoardMemberRepository();
		command = new ClaimInviteCommand(
			inviteRepo,
			memberRepo,
			new MockUnitOfWork(),
			new MockIdGenerator(),
			new MockDateProvider(),
		);
	});

	test("claims valid invite and adds member", async () => {
		await inviteRepo.create(
			BoardInviteEntity.restore(
				"inv-1",
				BoardIdVO.create("b1"),
				InviteTokenVO.create("id-2"),
				MemberRoleVO.EDITOR,
				new Date("2025-01-01"),
				null,
			),
		);
		const result = await command.execute({
			token: "id-2",
			userId: "user-2",
		});
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().alreadyMember).toBe(false);
		expect(result.unwrap().boardId).toBe("b1");
	});

	test("returns alreadyMember when user is already a member", async () => {
		const boardId = BoardIdVO.create("b1");
		await inviteRepo.create(
			BoardInviteEntity.restore(
				"inv-1",
				boardId,
				InviteTokenVO.create("id-2"),
				MemberRoleVO.EDITOR,
				new Date("2025-01-01"),
				null,
			),
		);
		await memberRepo.add(
			BoardMemberEntity.restore(
				"m1",
				boardId,
				"user-2",
				MemberRoleVO.EDITOR,
				new Date(),
			),
		);
		const result = await command.execute({ token: "id-2", userId: "user-2" });
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().alreadyMember).toBe(true);
	});

	test("returns InviteInvalidError for missing token", async () => {
		const result = await command.execute({
			token: "missing",
			userId: "user-1",
		});
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("InviteInvalid");
	});

	test("returns InviteExpiredError for expired invite", async () => {
		await inviteRepo.create(
			BoardInviteEntity.restore(
				"inv-1",
				BoardIdVO.create("b1"),
				InviteTokenVO.create("id-2"),
				MemberRoleVO.EDITOR,
				new Date("2024-01-01"),
				new Date("2024-12-31"), // past
			),
		);
		const result = await command.execute({ token: "id-2", userId: "user-2" });
		expect(result.isErr()).toBe(true);
		expect((result as any).error._tag).toBe("InviteExpired");
	});
});
