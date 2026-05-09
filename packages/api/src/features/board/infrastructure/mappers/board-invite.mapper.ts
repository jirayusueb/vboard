import { BoardInviteEntity } from "../../domain/entities/board-invite.entity";
import { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import { InviteTokenVO } from "../../domain/value-objects/invite-token.vo";
import { MemberRoleVO } from "../../domain/value-objects/member-role.vo";

type BoardInviteRow = {
	id: string;
	boardId: string;
	token: string;
	role: "owner" | "editor" | "viewer";
	createdAt: Date;
	expiresAt: Date | null;
};

export function toBoardInviteDomain(row: BoardInviteRow): BoardInviteEntity {
	return BoardInviteEntity.restore(
		row.id,
		BoardIdVO.create(row.boardId),
		InviteTokenVO.create(row.token),
		MemberRoleVO.fromString(row.role),
		row.createdAt,
		row.expiresAt,
	);
}
