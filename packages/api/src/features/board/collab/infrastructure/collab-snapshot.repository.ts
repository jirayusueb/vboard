/**
 * CollabSnapshotRepository — implements ICollabSnapshotRepository
 * by delegating to board's DrizzleBoardSnapshotRepository.
 *
 * This adapter decouples collab from board's domain types (BoardIdVO).
 */
import type { ICollabSnapshotRepository } from "../application/ports/i-collab-snapshot.repository";
import type { IBoardSnapshotRepository } from "../../application/ports/i-board-snapshot.repository";
import { BoardIdVO } from "../../domain/value-objects/board-id.vo";

export class CollabSnapshotRepository implements ICollabSnapshotRepository {
	constructor(private readonly boardSnapshotRepo: IBoardSnapshotRepository) {}

	async load(boardId: string): Promise<Buffer | null> {
		const snapshot = await this.boardSnapshotRepo.findLatest(
			BoardIdVO.create(boardId),
		);
		return snapshot?.data ?? null;
	}

	async save(boardId: string, data: Buffer): Promise<void> {
		await this.boardSnapshotRepo.save(BoardIdVO.create(boardId), data);
	}
}
