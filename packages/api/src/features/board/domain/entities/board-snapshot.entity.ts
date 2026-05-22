/**
 * BoardSnapshotEntity — a persisted Loro document state.
 * Immutable — only has restore() (snapshots are created by infrastructure).
 */
import type { BoardIdVO } from "../value-objects/board-id.vo";

export class BoardSnapshotEntity {
	private constructor(
		public readonly id: number,
		public readonly boardId: BoardIdVO,
		public readonly data: Buffer,
		public readonly createdAt: Date,
	) {}

	static restore(
		id: number,
		boardId: BoardIdVO,
		data: Buffer,
		createdAt: Date,
	): BoardSnapshotEntity {
		return new BoardSnapshotEntity(id, boardId, data, createdAt);
	}
}
