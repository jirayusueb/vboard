import type { BoardError } from "../../../domain/board.errors";
import type {
	ListUserBoardsInput,
	ListUserBoardsOutput,
} from "../../board.dtos";
import type { IBoardRepository } from "../../ports/i-board.repository";
import { Result } from "better-result";
import { BoardIdVO as Id } from "../../../domain/value-objects/board-id.vo";

export class ListUserBoardsQuery {
	constructor(private readonly boardRepo: IBoardRepository) {}

	async execute(
		input: ListUserBoardsInput,
	): Promise<Result<ListUserBoardsOutput, BoardError>> {
		const boards = await this.boardRepo.listByUserId(input.userId);

		return Result.ok({
			boards: boards.map((b) => ({
				id: Id.unwrap(b.id),
				title: b.title,
				visibility: b.visibility.value,
				ownerId: b.ownerId,
				createdAt: b.createdAt,
				updatedAt: b.updatedAt,
			})),
		});
	}
}
