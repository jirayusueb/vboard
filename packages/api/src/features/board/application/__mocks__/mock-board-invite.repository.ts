import type { IBoardInviteRepository } from "../ports/i-board-invite.repository";
import type { BoardInviteEntity } from "../../domain/entities/board-invite.entity";
import type { InviteTokenVO } from "../../domain/value-objects/invite-token.vo";

export class MockBoardInviteRepository implements IBoardInviteRepository {
	private invites: BoardInviteEntity[] = [];

	async findByToken(token: InviteTokenVO): Promise<BoardInviteEntity | null> {
		return (
			this.invites.find((i) => (i.token as string) === (token as string)) ??
			null
		);
	}

	async create(invite: BoardInviteEntity): Promise<void> {
		this.invites.push(invite);
	}

	async deleteByToken(token: InviteTokenVO): Promise<void> {
		this.invites = this.invites.filter(
			(i) => (i.token as string) !== (token as string),
		);
	}
}
