import type { BoardMemberEntity } from "../../domain/entities/board-member.entity";
import type { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import type { MemberRoleVO } from "../../domain/value-objects/member-role.vo";

export interface IBoardMemberRepository {
	findByBoardAndUser(
		boardId: BoardIdVO,
		userId: string,
	): Promise<BoardMemberEntity | null>;
	listByBoardId(boardId: BoardIdVO): Promise<BoardMemberEntity[]>;
	add(member: BoardMemberEntity): Promise<void>;
	updateRole(
		boardId: BoardIdVO,
		userId: string,
		role: MemberRoleVO,
	): Promise<void>;
	remove(boardId: BoardIdVO, userId: string): Promise<void>;
}
