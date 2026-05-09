
import { Result } from "better-result";
import type { BoardError } from "../../../domain/board.errors";
import type { RemoveMemberInput } from "../../board.dtos";
import type { IBoardRepository } from "../../ports/i-board.repository";
import type { IBoardMemberRepository } from "../../ports/i-board-member.repository";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import {
	BoardNotFoundError,
	BoardForbiddenError,
	MemberIsOwnerError,
} from "../../../domain/board.errors";

export class RemoveMemberCommand {
	constructor(
		private readonly boardRepo: IBoardRepository,
		private readonly memberRepo: IBoardMemberRepository,
	) {}

	async execute(input: RemoveMemberInput): Promise<Result<void, BoardError>> {
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
					action: "removeMember",
				}),
			);
		}

		// Can't remove the owner
		if (board.ownerId === input.targetUserId) {
			return Result.err(
				new MemberIsOwnerError({
					boardId: input.boardId,
					userId: input.targetUserId,
				}),
			);
		}

		await this.memberRepo.remove(boardId, input.targetUserId);
		return Result.ok(undefined);
	}
}
