/**
 * Application-layer DTOs for Board use cases.
 * These are plain interfaces — no Zod (that's transport layer).
 */

// ── Queries (read) ──────────────────────────────

export interface GetBoardInput {
	boardId: string;
	userId?: string;
}

export interface GetBoardOutput {
	id: string;
	title: string;
	visibility: string;
	ownerId: string;
	createdAt: Date;
	updatedAt: Date;
	role: string | null;
}

export interface ListUserBoardsInput {
	userId: string;
}

export interface ListUserBoardsOutput {
	boards: Array<{
		id: string;
		title: string;
		visibility: string;
		ownerId: string;
		createdAt: Date;
		updatedAt: Date;
	}>;
}

export interface GetBoardSnapshotInput {
	boardId: string;
	userId?: string;
}

export interface GetBoardSnapshotOutput {
	data: Buffer | null;
}

export interface ListMembersInput {
	boardId: string;
	userId: string;
}

export interface ListMembersOutput {
	members: Array<{
		id: string;
		userId: string;
		role: string;
		joinedAt: Date;
	}>;
}

// ── Commands (write) ────────────────────────────

export interface CreateBoardInput {
	title: string;
	visibility?: string;
	userId: string;
}

export interface CreateBoardOutput {
	id: string;
	title: string;
	visibility: string;
	ownerId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface UpdateBoardInput {
	boardId: string;
	title?: string;
	visibility?: string;
	userId: string;
}

export interface DeleteBoardInput {
	boardId: string;
	userId: string;
}

export interface CreateInviteInput {
	boardId: string;
	role: string;
	userId: string;
}

export interface CreateInviteOutput {
	token: string;
}

export interface ClaimInviteInput {
	token: string;
	userId: string;
}

export interface ClaimInviteOutput {
	boardId: string;
	alreadyMember: boolean;
}

export interface RemoveMemberInput {
	boardId: string;
	targetUserId: string;
	userId: string;
}

export interface TransferOwnershipInput {
	boardId: string;
	newOwnerId: string;
	userId: string;
}
