
import { Result } from "better-result";
import type { BoardError } from "../../../domain/board.errors";
import type {
	GetBoardSnapshotInput,
	GetBoardSnapshotOutput,
} from "../../board.dtos";
import type { IBoardSnapshotRepository } from "../../ports/i-board-snapshot.repository";
import type { IBoardRepository } from "../../ports/i-board.repository";
import type { IBoardMemberRepository } from "../../ports/i-board-member.repository";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import {
	BoardNotFoundError,
	BoardAccessDeniedError,
} from "../../../domain/board.errors";

export class GetBoardSnapshotQuery {
	constructor(
		private readonly snapshotRepo: IBoardSnapshotRepository,
		private readonly boardRepo: IBoardRepository,
		private readonly memberRepo: IBoardMemberRepository,
	) {}

	async execute(
		input: GetBoardSnapshotInput,
	): Promise<Result<GetBoardSnapshotOutput, BoardError>> {
		const boardId = BoardIdVO.create(input.boardId);
		const board = await this.boardRepo.findById(boardId);

		if (!board) {
			return Result.err(new BoardNotFoundError({ boardId: input.boardId }));
		}

		// Access check for private boards
		if (board.visibility.isPrivate && input.userId) {
			const member = await this.memberRepo.findByBoardAndUser(
				boardId,
				input.userId,
			);
			if (!member) {
				return Result.err(
					new BoardAccessDeniedError({ boardId: input.boardId }),
				);
			}
		}

		const snapshot = await this.snapshotRepo.findLatest(boardId);
		return Result.ok({ data: snapshot?.data ?? null });
	}
}
