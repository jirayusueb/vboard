import type { IBoardSnapshotRepository } from "../../application/ports/i-board-snapshot.repository";
import type { BoardSnapshotEntity } from "../../domain/entities/board-snapshot.entity";
import type { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import { db } from "../../../../shared/infrastructure/database";
import { txStorage } from "../../../../shared/infrastructure/database/transaction-context";
import { boardSnapshot } from "@vboard/db/schema/board";
import { and, eq, desc, notInArray } from "drizzle-orm";
import { toBoardSnapshotDomain } from "../mappers/board-snapshot.mapper";
import { BoardIdVO as Id } from "../../domain/value-objects/board-id.vo";

export class DrizzleBoardSnapshotRepository
	implements IBoardSnapshotRepository
{
	async findLatest(boardId: BoardIdVO): Promise<BoardSnapshotEntity | null> {
		const rows = await this.getDb()
			.select()
			.from(boardSnapshot)
			.where(eq(boardSnapshot.boardId, Id.unwrap(boardId)))
			.orderBy(desc(boardSnapshot.createdAt))
			.limit(1);
		const row = rows[0];
		if (!row) return null;
		return toBoardSnapshotDomain(row);
	}

	async save(boardId: BoardIdVO, data: Buffer): Promise<void> {
		await this.getDb()
			.insert(boardSnapshot)
			.values({
				boardId: Id.unwrap(boardId),
				data,
			});
	}

	private getDb() {
		return txStorage.getStore() ?? db;
	}

	async cleanupOld(boardId: BoardIdVO, keepCount: number): Promise<number> {
		// Find IDs of snapshots to keep (latest N)
		const keepRows = await this.getDb()
			.select({ id: boardSnapshot.id })
			.from(boardSnapshot)
			.where(eq(boardSnapshot.boardId, Id.unwrap(boardId)))
			.orderBy(desc(boardSnapshot.createdAt))
			.limit(keepCount);

		if (keepRows.length === 0) return 0;

		const keepIds = keepRows.map((r) => r.id);

		// Delete all snapshots for this board that are NOT in the keep set
		const deleted = await this.getDb()
			.delete(boardSnapshot)
			.where(
				and(
					eq(boardSnapshot.boardId, Id.unwrap(boardId)),
					notInArray(boardSnapshot.id, keepIds),
				),
			);

		return (deleted as unknown as { rowCount: number }).rowCount ?? 0;
	}
}
