import type { IBoardMemberRepository } from "../ports/i-board-member.repository";
import type { BoardMemberEntity } from "../../domain/entities/board-member.entity";
import type { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import type { MemberRoleVO } from "../../domain/value-objects/member-role.vo";

export class MockBoardMemberRepository implements IBoardMemberRepository {
	private members: BoardMemberEntity[] = [];

	async findByBoardAndUser(
		boardId: BoardIdVO,
		userId: string,
	): Promise<BoardMemberEntity | null> {
		return (
			this.members.find(
				(m) =>
					(m.boardId as string) === (boardId as string) && m.userId === userId,
			) ?? null
		);
	}

	async listByBoardId(boardId: BoardIdVO): Promise<BoardMemberEntity[]> {
		return this.members.filter(
			(m) => (m.boardId as string) === (boardId as string),
		);
	}

	async add(member: BoardMemberEntity): Promise<void> {
		this.members.push(member);
	}

	async updateRole(
		boardId: BoardIdVO,
		userId: string,
		role: MemberRoleVO,
	): Promise<void> {
		const member = this.members.find(
			(m) =>
				(m.boardId as string) === (boardId as string) && m.userId === userId,
		);
		if (member) {
			member.role = role;
		}
	}

	async remove(boardId: BoardIdVO, userId: string): Promise<void> {
		this.members = this.members.filter(
			(m) =>
				!((m.boardId as string) === (boardId as string) && m.userId === userId),
		);
	}
}
