
import { Result } from "better-result";
import type { BoardError } from "../../../domain/board.errors";
import type { DeleteBoardInput } from "../../board.dtos";
import type { IBoardRepository } from "../../ports/i-board.repository";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import {
	BoardNotFoundError,
	BoardForbiddenError,
} from "../../../domain/board.errors";

export class DeleteBoardCommand {
	constructor(private readonly boardRepo: IBoardRepository) {}

	async execute(input: DeleteBoardInput): Promise<Result<void, BoardError>> {
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
					action: "delete",
				}),
			);
		}

		await this.boardRepo.delete(boardId);
		return Result.ok(undefined);
	}
}
