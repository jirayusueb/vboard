/**
 * Port for snapshot persistence — decoupled from board's IBoardSnapshotRepository.
 * Collab only needs to load/save binary snapshots, nothing else.
 */
export interface ICollabSnapshotRepository {
	load(boardId: string): Promise<Buffer | null>;
	save(boardId: string, data: Buffer): Promise<void>;
}
