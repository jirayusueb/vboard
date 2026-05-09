import { BoardEntity } from "../../domain/entities/board.entity";
import { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../domain/value-objects/board-visibility.vo";

type BoardRow = {
	id: string;
	title: string;
	visibility: "public" | "private";
	ownerId: string;
	createdAt: Date;
	updatedAt: Date;
};

export function toBoardDomain(row: BoardRow): BoardEntity {
	return BoardEntity.restore(
		BoardIdVO.create(row.id),
		row.title,
		BoardVisibilityVO.fromString(row.visibility),
		row.ownerId,
		row.createdAt,
		row.updatedAt,
	);
}
