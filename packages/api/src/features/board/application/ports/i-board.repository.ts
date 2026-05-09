import type { BoardEntity } from "../../domain/entities/board.entity";
import type { BoardIdVO } from "../../domain/value-objects/board-id.vo";

export interface IBoardRepository {
	findById(id: BoardIdVO): Promise<BoardEntity | null>;
	create(board: BoardEntity): Promise<BoardEntity>;
	update(board: BoardEntity): Promise<void>;
	delete(id: BoardIdVO): Promise<void>;
	listByUserId(userId: string): Promise<BoardEntity[]>;
	updateOwnerId(id: BoardIdVO, newOwnerId: string): Promise<void>;
}
