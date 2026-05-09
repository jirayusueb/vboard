import type { IBoardMemberRepository } from "../../application/ports/i-board-member.repository";
import type { BoardMemberEntity } from "../../domain/entities/board-member.entity";
import type { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import type { MemberRoleVO } from "../../domain/value-objects/member-role.vo";
import { db } from "../../../../shared/infrastructure/database";
import { txStorage } from "../../../../shared/infrastructure/database/transaction-context";
import { boardMember } from "@vboard/db/schema/board";
import { eq, and } from "drizzle-orm";
import { toBoardMemberDomain } from "../mappers/board-member.mapper";
import { BoardIdVO as Id } from "../../domain/value-objects/board-id.vo";

export class DrizzleBoardMemberRepository implements IBoardMemberRepository {
	async findByBoardAndUser(
		boardId: BoardIdVO,
		userId: string,
	): Promise<BoardMemberEntity | null> {
		const rows = await this.getDb()
			.select()
			.from(boardMember)
			.where(
				and(
					eq(boardMember.boardId, Id.unwrap(boardId)),
					eq(boardMember.userId, userId),
				),
			)
			.limit(1);
		const row = rows[0];
		if (!row) return null;
		return toBoardMemberDomain(row);
	}

	async listByBoardId(boardId: BoardIdVO): Promise<BoardMemberEntity[]> {
		const rows = await this.getDb()
			.select()
			.from(boardMember)
			.where(eq(boardMember.boardId, Id.unwrap(boardId)));
		return rows.map((row) => toBoardMemberDomain(row));
	}

	async add(member: BoardMemberEntity): Promise<void> {
		await this.getDb()
			.insert(boardMember)
			.values({
				id: member.id,
				boardId: Id.unwrap(member.boardId),
				userId: member.userId,
				role: member.role.value as "owner" | "editor" | "viewer",
			});
	}

	async updateRole(
		boardId: BoardIdVO,
		userId: string,
		role: MemberRoleVO,
	): Promise<void> {
		await this.getDb()
			.update(boardMember)
			.set({ role: role.value as "owner" | "editor" | "viewer" })
			.where(
				and(
					eq(boardMember.boardId, Id.unwrap(boardId)),
					eq(boardMember.userId, userId),
				),
			);
	}

	async remove(boardId: BoardIdVO, userId: string): Promise<void> {
		await this.getDb()
			.delete(boardMember)
			.where(
				and(
					eq(boardMember.boardId, Id.unwrap(boardId)),
					eq(boardMember.userId, userId),
				),
			);
	}

	private getDb() {
		return txStorage.getStore() ?? db;
	}
}
