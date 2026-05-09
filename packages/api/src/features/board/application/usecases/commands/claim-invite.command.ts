import type { BoardError } from "../../../domain/board.errors";
import type { ClaimInviteInput, ClaimInviteOutput } from "../../board.dtos";
import type { IBoardInviteRepository } from "../../ports/i-board-invite.repository";
import type { IBoardMemberRepository } from "../../ports/i-board-member.repository";
import type { IUnitOfWork } from "../../../../../shared/application/interfaces/i-unit-of-work";
import type { IIdGenerator } from "../../../../../shared/application/interfaces/i-id-generator";
import type { IDateProvider } from "../../../../../shared/application/interfaces/i-date-provider";
import { Result } from "better-result";
import { InviteTokenVO } from "../../../domain/value-objects/invite-token.vo";
import { BoardMemberEntity } from "../../../domain/entities/board-member.entity";
import {
	InviteInvalidError,
	InviteExpiredError,
} from "../../../domain/board.errors";
import { unbrand } from "../../../../../shared/kernel/types";

export class ClaimInviteCommand {
	constructor(
		private readonly inviteRepo: IBoardInviteRepository,
		private readonly memberRepo: IBoardMemberRepository,
		private readonly uow: IUnitOfWork,
		private readonly idGenerator: IIdGenerator,
		private readonly dateProvider: IDateProvider,
	) {}

	async execute(
		input: ClaimInviteInput,
	): Promise<Result<ClaimInviteOutput, BoardError>> {
		const token = InviteTokenVO.create(input.token);
		const invite = await this.inviteRepo.findByToken(token);

		if (!invite) {
			return Result.err(new InviteInvalidError({ token: input.token }));
		}

		if (invite.isExpired) {
			return Result.err(new InviteExpiredError({ token: input.token }));
		}

		// Check if already a member
		const existing = await this.memberRepo.findByBoardAndUser(
			invite.boardId,
			input.userId,
		);
		if (existing) {
			return Result.ok({
				boardId: unbrand(invite.boardId),
				alreadyMember: true,
			});
		}

		// Transactional: add member + delete invite
		return this.uow.runInTransaction(async () => {
			const now = this.dateProvider.now();
			const member = BoardMemberEntity.create(
				this.idGenerator.generate(),
				invite.boardId,
				input.userId,
				invite.role,
				now,
			);

			if (member.isOk()) {
				await this.memberRepo.add(member.unwrap());
			}
			await this.inviteRepo.deleteByToken(token);

			return Result.ok({
				boardId: unbrand(invite.boardId),
				alreadyMember: false,
			});
		});
	}
}
