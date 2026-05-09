import { BoardMemberEntity } from "../../domain/entities/board-member.entity";
import { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import { MemberRoleVO } from "../../domain/value-objects/member-role.vo";

type BoardMemberRow = {
	id: string;
	boardId: string;
	userId: string;
	role: "owner" | "editor" | "viewer";
	joinedAt: Date;
};

export function toBoardMemberDomain(row: BoardMemberRow): BoardMemberEntity {
	return BoardMemberEntity.restore(
		row.id,
		BoardIdVO.create(row.boardId),
		row.userId,
		MemberRoleVO.fromString(row.role),
		row.joinedAt,
	);
}
