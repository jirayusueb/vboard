import type { IBoardInviteRepository } from "../../application/ports/i-board-invite.repository";
import type { BoardInviteEntity } from "../../domain/entities/board-invite.entity";
import type { InviteTokenVO } from "../../domain/value-objects/invite-token.vo";
import { db } from "../../../../shared/infrastructure/database";
import { txStorage } from "../../../../shared/infrastructure/database/transaction-context";
import { boardInvite } from "@vboard/db/schema/board";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { toBoardInviteDomain } from "../mappers/board-invite.mapper";
import { InviteTokenVO as TokenId } from "../../domain/value-objects/invite-token.vo";
import { BoardIdVO as BoardId } from "../../domain/value-objects/board-id.vo";

export class DrizzleBoardInviteRepository implements IBoardInviteRepository {
	async findByToken(token: InviteTokenVO): Promise<BoardInviteEntity | null> {
		const rows = await this.getDb()
			.select()
			.from(boardInvite)
			.where(eq(boardInvite.token, TokenId.unwrap(token)))
			.limit(1);
		const row = rows[0];
		if (!row) return null;
		return toBoardInviteDomain(row);
	}

	async create(invite: BoardInviteEntity): Promise<void> {
		await this.getDb()
			.insert(boardInvite)
			.values({
				id: invite.id,
				boardId: BoardId.unwrap(invite.boardId),
				token: TokenId.unwrap(invite.token),
				role: invite.role.value as "owner" | "editor" | "viewer",
				expiresAt: invite.expiresAt,
			});
	}

	async deleteByToken(token: InviteTokenVO): Promise<void> {
		await this.getDb()
			.delete(boardInvite)
			.where(eq(boardInvite.token, TokenId.unwrap(token)));
	}

	async deleteExpired(): Promise<number> {
		const now = new Date();
		const result = await this.getDb()
			.delete(boardInvite)
			.where(
				and(
					isNotNull(boardInvite.expiresAt),
					lt(boardInvite.expiresAt, now),
				),
			);
		return (result as unknown as { rowCount: number }).rowCount ?? 0;
	}

	private getDb() {
		return txStorage.getStore() ?? db;
	}
}
