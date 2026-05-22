import type { IBoardRepository } from "../../application/ports/i-board.repository";
import type { BoardEntity } from "../../domain/entities/board.entity";
import type { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import { db } from "../../../../shared/infrastructure/database";
import { txStorage } from "../../../../shared/infrastructure/database/transaction-context";
import { board } from "@vboard/db/schema/board";
import { boardMember } from "@vboard/db/schema/board";
import { eq } from "@vboard/db";
import { toBoardDomain } from "../mappers/board.mapper";
import { BoardIdVO as Id } from "../../domain/value-objects/board-id.vo";

export class DrizzleBoardRepository implements IBoardRepository {
	async findById(id: BoardIdVO): Promise<BoardEntity | null> {
		const query = this.getDb()
			.select()
			.from(board)
			.where(eq(board.id, Id.unwrap(id)))
			.limit(1);
		const rows = await query;
		const row = rows[0];
		if (!row) return null;
		return toBoardDomain(row);
	}

	async create(boardEntity: BoardEntity): Promise<BoardEntity> {
		const rows = await this.getDb()
			.insert(board)
			.values({
				id: Id.unwrap(boardEntity.id),
				title: boardEntity.title,
				visibility: boardEntity.visibility.value as "public" | "private",
				ownerId: boardEntity.ownerId,
			})
			.returning();
		return toBoardDomain(rows[0]!);
	}

	async update(boardEntity: BoardEntity): Promise<void> {
		await this.getDb()
			.update(board)
			.set({
				title: boardEntity.title,
				visibility: boardEntity.visibility.value as "public" | "private",
				updatedAt: boardEntity.updatedAt,
			})
			.where(eq(board.id, Id.unwrap(boardEntity.id)));
	}

	async delete(id: BoardIdVO): Promise<void> {
		await this.getDb()
			.delete(board)
			.where(eq(board.id, Id.unwrap(id)));
	}

	async listByUserId(userId: string): Promise<BoardEntity[]> {
		const rows = await this.getDb()
			.select({ board: board })
			.from(boardMember)
			.innerJoin(board, eq(boardMember.boardId, board.id))
			.where(eq(boardMember.userId, userId));
		return rows.map((r) => toBoardDomain(r.board));
	}

	async updateOwnerId(id: BoardIdVO, newOwnerId: string): Promise<void> {
		await this.getDb()
			.update(board)
			.set({ ownerId: newOwnerId })
			.where(eq(board.id, Id.unwrap(id)));
	}

	/** Use transaction if in AsyncLocalStorage, otherwise use bare db */
	private getDb() {
		return txStorage.getStore() ?? db;
	}
}
