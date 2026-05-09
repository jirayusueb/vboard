import type { IBoardSnapshotRepository } from "../ports/i-board-snapshot.repository";
import type { BoardSnapshotEntity } from "../../domain/entities/board-snapshot.entity";
import type { BoardIdVO } from "../../domain/value-objects/board-id.vo";

export class MockBoardSnapshotRepository implements IBoardSnapshotRepository {
	private snapshots: BoardSnapshotEntity[] = [];
	private nextId = 1;

	async findLatest(boardId: BoardIdVO): Promise<BoardSnapshotEntity | null> {
		const matching = this.snapshots.filter(
			(s) => (s.boardId as string) === (boardId as string),
		);
		return matching[matching.length - 1] ?? null;
	}

	async save(boardId: BoardIdVO, data: Buffer): Promise<void> {
		const { BoardSnapshotEntity } = await import(
			"../../domain/entities/board-snapshot.entity"
		);
		this.snapshots.push(
			BoardSnapshotEntity.restore(this.nextId++, boardId, data, new Date()),
		);
	}
}
