import type { BoardInviteEntity } from "../../domain/entities/board-invite.entity";
import type { InviteTokenVO } from "../../domain/value-objects/invite-token.vo";

export interface IBoardInviteRepository {
	findByToken(token: InviteTokenVO): Promise<BoardInviteEntity | null>;
	create(invite: BoardInviteEntity): Promise<void>;
	deleteByToken(token: InviteTokenVO): Promise<void>;
	/** Delete all invites that have expired */
	deleteExpired(): Promise<number>;
}
