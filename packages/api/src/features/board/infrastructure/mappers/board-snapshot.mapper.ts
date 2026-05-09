import { BoardSnapshotEntity } from "../../domain/entities/board-snapshot.entity";
import { BoardIdVO } from "../../domain/value-objects/board-id.vo";

type BoardSnapshotRow = {
	id: number;
	boardId: string;
	data: Buffer;
	createdAt: Date;
};

export function toBoardSnapshotDomain(
	row: BoardSnapshotRow,
): BoardSnapshotEntity {
	return BoardSnapshotEntity.restore(
		row.id,
		BoardIdVO.create(row.boardId),
		row.data,
		row.createdAt,
	);
}
