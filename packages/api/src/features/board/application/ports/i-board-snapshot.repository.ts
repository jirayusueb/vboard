import type { BoardSnapshotEntity } from "../../domain/entities/board-snapshot.entity";
import type { BoardIdVO } from "../../domain/value-objects/board-id.vo";

export interface IBoardSnapshotRepository {
	findLatest(boardId: BoardIdVO): Promise<BoardSnapshotEntity | null>;
	save(boardId: BoardIdVO, data: Buffer): Promise<void>;
	/** Delete all but the latest `keepCount` snapshots for a given board */
	cleanupOld(boardId: BoardIdVO, keepCount: number): Promise<number>;
}
