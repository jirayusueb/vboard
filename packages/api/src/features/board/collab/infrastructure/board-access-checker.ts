/**
 * BoardAccessChecker — implements IBoardAccessChecker using board repos.
 * This is the adapter that bridges collab's application layer to board's infrastructure.
 */
import type { IBoardAccessChecker } from "../application/ports/i-board-access-checker.port";
import type { IBoardRepository } from "../../application/ports/i-board.repository";
import type { IBoardMemberRepository } from "../../application/ports/i-board-member.repository";
import type { AccessLevel } from "../domain/value-objects/access-level.vo";
import type { CollabError } from "../domain/collab.errors";
import { Result } from "better-result";
import { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import {
	CollabBoardNotFoundError,
	CollabAccessDeniedError,
} from "../domain/collab.errors";
import { AccessLevel as AccessLevelFactory } from "../domain/value-objects/access-level.vo";

export class BoardAccessChecker implements IBoardAccessChecker {
	constructor(
		private readonly boardRepo: IBoardRepository,
		private readonly memberRepo: IBoardMemberRepository,
	) {}

	async checkAccess(
		boardId: string,
		userId: string | null,
	): Promise<Result<AccessLevel, CollabError>> {
		const id = BoardIdVO.create(boardId);
		const board = await this.boardRepo.findById(id);

		if (!board) {
			return Result.err(new CollabBoardNotFoundError({ boardId }));
		}

		// Public board + anonymous user → read-only
		if (!userId) {
			if (board.visibility.isPublic) {
				return Result.ok(AccessLevelFactory.READ_ONLY);
			}
			return Result.err(new CollabAccessDeniedError({ boardId, userId: null }));
		}

		// Check membership
		const member = await this.memberRepo.findByBoardAndUser(id, userId);
		if (!member && board.visibility.isPrivate) {
			return Result.err(new CollabAccessDeniedError({ boardId, userId }));
		}

		// Member with edit permission → editor, otherwise read-only
		return Result.ok(AccessLevelFactory.fromBoolean(member?.canEdit ?? false));
	}
}
