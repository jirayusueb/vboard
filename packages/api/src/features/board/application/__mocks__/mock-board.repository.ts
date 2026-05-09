import type { IBoardRepository } from "../ports/i-board.repository";
import type { BoardEntity } from "../../domain/entities/board.entity";
import type { BoardIdVO } from "../../domain/value-objects/board-id.vo";

export class MockBoardRepository implements IBoardRepository {
	private boards: Map<string, BoardEntity> = new Map();

	async findById(id: BoardIdVO): Promise<BoardEntity | null> {
		return this.boards.get(id as string) ?? null;
	}

	async create(board: BoardEntity): Promise<BoardEntity> {
		this.boards.set(board.id as string, board);
		return board;
	}

	async update(board: BoardEntity): Promise<void> {
		this.boards.set(board.id as string, board);
	}

	async delete(id: BoardIdVO): Promise<void> {
		this.boards.delete(id as string);
	}

	async listByUserId(_userId: string): Promise<BoardEntity[]> {
		return Array.from(this.boards.values());
	}

	async updateOwnerId(id: BoardIdVO, newOwnerId: string): Promise<void> {
		const board = this.boards.get(id as string);
		if (board) {
			// @ts-expect-error — ownerId is readonly but we need this for transfer
			board.ownerId = newOwnerId;
		}
	}
}
