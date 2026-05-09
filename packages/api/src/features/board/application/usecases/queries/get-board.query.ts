import type { BoardError } from "../../../domain/board.errors";
import type { GetBoardInput, GetBoardOutput } from "../../board.dtos";
import type { IBoardRepository } from "../../ports/i-board.repository";
import type { IBoardMemberRepository } from "../../ports/i-board-member.repository";
import { Result } from "better-result";
import {
	BoardNotFoundError,
	BoardAccessDeniedError,
} from "../../../domain/board.errors";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";

export class GetBoardQuery {
	constructor(
		private readonly boardRepo: IBoardRepository,
		private readonly memberRepo: IBoardMemberRepository,
	) {}

	async execute(
		input: GetBoardInput,
	): Promise<Result<GetBoardOutput, BoardError>> {
		const boardId = BoardIdVO.create(input.boardId);
		const board = await this.boardRepo.findById(boardId);

		if (!board) {
			return Result.err(new BoardNotFoundError({ boardId: input.boardId }));
		}

		// Access check: public boards are viewable by anyone
		if (board.visibility.isPrivate && !input.userId) {
			return Result.err(new BoardAccessDeniedError({ boardId: input.boardId }));
		}

		// Check membership for private boards
		let role: string | null = null;
		if (input.userId) {
			const member = await this.memberRepo.findByBoardAndUser(
				boardId,
				input.userId,
			);
			role = member?.role.value ?? null;

			// Private board: must be a member
			if (board.visibility.isPrivate && !member) {
				return Result.err(
					new BoardAccessDeniedError({
						boardId: input.boardId,
						userId: input.userId,
					}),
				);
			}
		}

		return Result.ok({
			id: BoardIdVO.unwrap(board.id),
			title: board.title,
			visibility: board.visibility.value,
			ownerId: board.ownerId,
			createdAt: board.createdAt,
			updatedAt: board.updatedAt,
			role,
		});
	}
}
