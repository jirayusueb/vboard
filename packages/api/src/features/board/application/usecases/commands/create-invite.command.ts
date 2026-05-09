import type { BoardError } from "../../../domain/board.errors";
import type { CreateInviteInput, CreateInviteOutput } from "../../board.dtos";
import type { IBoardRepository } from "../../ports/i-board.repository";
import type { IBoardInviteRepository } from "../../ports/i-board-invite.repository";
import type { IIdGenerator } from "../../../../../shared/application/interfaces/i-id-generator";
import type { IDateProvider } from "../../../../../shared/application/interfaces/i-date-provider";
import { Result } from "better-result";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { InviteTokenVO } from "../../../domain/value-objects/invite-token.vo";
import { MemberRoleVO } from "../../../domain/value-objects/member-role.vo";
import {
	BoardNotFoundError,
	BoardForbiddenError,
} from "../../../domain/board.errors";
import { BoardInviteEntity } from "../../../domain/entities/board-invite.entity";
import { unbrand } from "../../../../../shared/kernel/types";

export class CreateInviteCommand {
	constructor(
		private readonly boardRepo: IBoardRepository,
		private readonly inviteRepo: IBoardInviteRepository,
		private readonly idGenerator: IIdGenerator,
		private readonly dateProvider: IDateProvider,
	) {}

	async execute(
		input: CreateInviteInput,
	): Promise<Result<CreateInviteOutput, BoardError>> {
		const boardId = BoardIdVO.create(input.boardId);
		const board = await this.boardRepo.findById(boardId);

		if (!board) {
			return Result.err(new BoardNotFoundError({ boardId: input.boardId }));
		}

		if (!board.isOwnedBy(input.userId)) {
			return Result.err(
				new BoardForbiddenError({
					boardId: input.boardId,
					userId: input.userId,
					action: "createInvite",
				}),
			);
		}

		const token = InviteTokenVO.create(this.idGenerator.generate());
		const role = MemberRoleVO.fromString(input.role);

		const inviteResult = BoardInviteEntity.create(
			this.idGenerator.generate(),
			boardId,
			token,
			role,
			this.dateProvider,
		);

		if (inviteResult.isErr()) {
			// BoardInviteEntity validation returns string errors
			return Result.err(inviteResult.error as unknown as BoardError);
		}

		await this.inviteRepo.create(inviteResult.unwrap());

		return Result.ok({ token: unbrand(token) });
	}
}
