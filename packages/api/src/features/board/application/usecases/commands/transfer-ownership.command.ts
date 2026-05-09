
import { Result } from "better-result";
import type { BoardError } from "../../../domain/board.errors";
import type { TransferOwnershipInput } from "../../board.dtos";
import type { IBoardRepository } from "../../ports/i-board.repository";
import type { IBoardMemberRepository } from "../../ports/i-board-member.repository";
import type { IUnitOfWork } from "../../../../../shared/application/interfaces/i-unit-of-work";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { MemberRoleVO } from "../../../domain/value-objects/member-role.vo";
import {
	BoardNotFoundError,
	BoardForbiddenError,
} from "../../../domain/board.errors";

export class TransferOwnershipCommand {
	constructor(
		private readonly boardRepo: IBoardRepository,
		private readonly memberRepo: IBoardMemberRepository,
		private readonly uow: IUnitOfWork,
	) {}

	async execute(
		input: TransferOwnershipInput,
	): Promise<Result<void, BoardError>> {
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
					action: "transferOwnership",
				}),
			);
		}

		// Verify target is a member
		const targetMember = await this.memberRepo.findByBoardAndUser(
			boardId,
			input.newOwnerId,
		);
		if (!targetMember) {
			return Result.err(
				new BoardForbiddenError({
					boardId: input.boardId,
					userId: input.newOwnerId,
					action: "transferOwnership_targetNotMember",
				}),
			);
		}

		// Transactional: update roles + board ownerId
		return this.uow.runInTransaction(async () => {
			// Update target to owner
			await this.memberRepo.updateRole(
				boardId,
				input.newOwnerId,
				MemberRoleVO.OWNER,
			);

			// Update current owner to editor
			await this.memberRepo.updateRole(
				boardId,
				input.userId,
				MemberRoleVO.EDITOR,
			);

			// Update board ownerId — we need a method for this
			// The board entity doesn't expose ownerId mutation, so we handle it in repo
			await this.boardRepo.updateOwnerId(boardId, input.newOwnerId);

			return Result.ok(undefined);
		});
	}
}
