
import { Result } from "better-result";
import type { BoardError } from "../../../domain/board.errors";
import type { ListMembersInput, ListMembersOutput } from "../../board.dtos";
import type { IBoardMemberRepository } from "../../ports/i-board-member.repository";
import type { IBoardRepository } from "../../ports/i-board.repository";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import {
	BoardNotFoundError,
	BoardAccessDeniedError,
} from "../../../domain/board.errors";

export class ListMembersQuery {
	constructor(
		private readonly memberRepo: IBoardMemberRepository,
		private readonly boardRepo: IBoardRepository,
	) {}

	async execute(
		input: ListMembersInput,
	): Promise<Result<ListMembersOutput, BoardError>> {
		const boardId = BoardIdVO.create(input.boardId);
		const board = await this.boardRepo.findById(boardId);

		if (!board) {
			return Result.err(new BoardNotFoundError({ boardId: input.boardId }));
		}

		// Must be a member to view members
		const member = await this.memberRepo.findByBoardAndUser(
			boardId,
			input.userId,
		);
		if (!member) {
			return Result.err(
				new BoardAccessDeniedError({
					boardId: input.boardId,
					userId: input.userId,
				}),
			);
		}

		const members = await this.memberRepo.listByBoardId(boardId);
		return Result.ok({
			members: members.map((m) => ({
				id: m.id,
				userId: m.userId,
				role: m.role.value,
				joinedAt: m.joinedAt,
			})),
		});
	}
}
