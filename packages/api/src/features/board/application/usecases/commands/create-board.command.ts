import type { BoardError } from "../../../domain/board.errors";
import type { CreateBoardInput, CreateBoardOutput } from "../../board.dtos";
import type { IBoardRepository } from "../../ports/i-board.repository";
import type { IBoardMemberRepository } from "../../ports/i-board-member.repository";
import type { IUnitOfWork } from "../../../../../shared/application/interfaces/i-unit-of-work";
import type { IIdGenerator } from "../../../../../shared/application/interfaces/i-id-generator";
import type { IDateProvider } from "../../../../../shared/application/interfaces/i-date-provider";
import { Result } from "better-result";
import { BoardEntity } from "../../../domain/entities/board.entity";
import { BoardMemberEntity } from "../../../domain/entities/board-member.entity";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../../domain/value-objects/board-visibility.vo";
import { MemberRoleVO } from "../../../domain/value-objects/member-role.vo";
import { unbrand } from "../../../../../shared/kernel/types";

export class CreateBoardCommand {
	constructor(
		private readonly boardRepo: IBoardRepository,
		private readonly memberRepo: IBoardMemberRepository,
		private readonly uow: IUnitOfWork,
		private readonly idGenerator: IIdGenerator,
		private readonly dateProvider: IDateProvider,
	) {}

	async execute(
		input: CreateBoardInput,
	): Promise<Result<CreateBoardOutput, BoardError>> {
		const now = this.dateProvider.now();
		const boardId = BoardIdVO.create(this.idGenerator.generate());
		const visibility = input.visibility
			? BoardVisibilityVO.fromString(input.visibility)
			: BoardVisibilityVO.PRIVATE;

		// Create board entity (validates)
		const boardResult = BoardEntity.create(
			boardId,
			input.title,
			visibility,
			input.userId,
			now,
		);
		if (boardResult.isErr()) {
			// Entity validation returns string errors — treat as 500
			return Result.err(boardResult.error as unknown as BoardError);
		}

		// Transactional: create board + add owner as member
		return this.uow.runInTransaction(async () => {
			const board = await this.boardRepo.create(boardResult.unwrap());

			const member = BoardMemberEntity.create(
				this.idGenerator.generate(),
				boardId,
				input.userId,
				MemberRoleVO.OWNER,
				now,
			);
			if (member.isOk()) {
				await this.memberRepo.add(member.unwrap());
			}

			return Result.ok({
				id: unbrand(board.id),
				title: board.title,
				visibility: board.visibility.value,
				ownerId: board.ownerId,
				createdAt: board.createdAt,
				updatedAt: board.updatedAt,
			});
		});
	}
}
