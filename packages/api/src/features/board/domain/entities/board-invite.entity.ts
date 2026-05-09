/**
 * BoardInviteEntity — a shareable invite link for a board.
 */
import type { BoardIdVO } from "../value-objects/board-id.vo";
import type { InviteTokenVO } from "../value-objects/invite-token.vo";
import type { MemberRoleVO } from "../value-objects/member-role.vo";
import type { IDateProvider } from "../../../../shared/application/interfaces/i-date-provider";
import { Result } from "better-result";

export class BoardInviteEntity {
	private constructor(
		public readonly id: string,
		public readonly boardId: BoardIdVO,
		public readonly token: InviteTokenVO,
		public readonly role: MemberRoleVO,
		public readonly createdAt: Date,
		public readonly expiresAt: Date | null,
	) {}

	get isExpired(): boolean {
		if (!this.expiresAt) return false;
		return new Date() > this.expiresAt;
	}

	static create(
		id: string,
		boardId: BoardIdVO,
		token: InviteTokenVO,
		role: MemberRoleVO,
		dateProvider: IDateProvider,
		expiresInMinutes?: number,
	): Result<BoardInviteEntity, string> {
		const now = dateProvider.now();
		const expiresAt = expiresInMinutes
			? dateProvider.addMinutes(expiresInMinutes, now)
			: null;
		return Result.ok(
			new BoardInviteEntity(id, boardId, token, role, now, expiresAt),
		);
	}

	static restore(
		id: string,
		boardId: BoardIdVO,
		token: InviteTokenVO,
		role: MemberRoleVO,
		createdAt: Date,
		expiresAt: Date | null,
	): BoardInviteEntity {
		return new BoardInviteEntity(
			id,
			boardId,
			token,
			role,
			createdAt,
			expiresAt,
		);
	}
}
