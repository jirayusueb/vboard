/**
 * BoardMemberEntity — represents a user's membership in a board.
 */
import type { BoardIdVO } from "../value-objects/board-id.vo";
import type { MemberRoleVO } from "../value-objects/member-role.vo";
import { Result } from "better-result";

export class BoardMemberEntity {
	private constructor(
		public readonly id: string,
		public readonly boardId: BoardIdVO,
		public readonly userId: string,
		public role: MemberRoleVO,
		public readonly joinedAt: Date,
	) {}

	get canEdit(): boolean {
		return this.role.canEdit;
	}

	get canManage(): boolean {
		return this.role.canManage;
	}

	static create(
		id: string,
		boardId: BoardIdVO,
		userId: string,
		role: MemberRoleVO,
		now: Date,
	): Result<BoardMemberEntity, string> {
		if (!userId) return Result.err("User ID is required");
		if (!boardId) return Result.err("Board ID is required");
		return Result.ok(new BoardMemberEntity(id, boardId, userId, role, now));
	}

	static restore(
		id: string,
		boardId: BoardIdVO,
		userId: string,
		role: MemberRoleVO,
		joinedAt: Date,
	): BoardMemberEntity {
		return new BoardMemberEntity(id, boardId, userId, role, joinedAt);
	}
}
