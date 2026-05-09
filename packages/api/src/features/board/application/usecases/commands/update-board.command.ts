
import { Result } from "better-result";
import type { BoardError } from "../../../domain/board.errors";
import type { UpdateBoardInput } from "../../board.dtos";
import type { IBoardRepository } from "../../ports/i-board.repository";
import type { IDateProvider } from "../../../../../shared/application/interfaces/i-date-provider";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../../domain/value-objects/board-visibility.vo";
import {
	BoardNotFoundError,
	BoardForbiddenError,
} from "../../../domain/board.errors";

export class UpdateBoardCommand {
	constructor(
		private readonly boardRepo: IBoardRepository,
		private readonly dateProvider: IDateProvider,
	) {}

	async execute(input: UpdateBoardInput): Promise<Result<void, BoardError>> {
		const boardId = BoardIdVO.create(input.boardId);
		const board = await this.boardRepo.findById(boardId);

		if (!board) {
			return Result.err(new BoardNotFoundError({ boardId: input.boardId }));
		}

		// Authorization: only owner can update
		if (!board.isOwnedBy(input.userId)) {
			return Result.err(
				new BoardForbiddenError({
					boardId: input.boardId,
					userId: input.userId,
					action: "update",
				}),
			);
		}

		const now = this.dateProvider.now();

		if (input.title !== undefined) {
			board.updateTitle(input.title, now);
		}
		if (input.visibility !== undefined) {
			board.changeVisibility(
				BoardVisibilityVO.fromString(input.visibility),
				now,
			);
		}

		await this.boardRepo.update(board);
		return Result.ok(undefined);
	}
}
