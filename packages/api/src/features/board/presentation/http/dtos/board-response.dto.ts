import { z } from "zod";

export const boardResponseSchema = z.object({
	id: z.string(),
	title: z.string(),
	visibility: z.enum(["public", "private"]),
	ownerId: z.string(),
	createdAt: z.date(),
	updatedAt: z.date(),
	role: z.string().nullable().optional(),
});

export const boardListResponseSchema = z.array(boardResponseSchema);

export const okResponseSchema = z.object({ ok: z.boolean() });

export const inviteResponseSchema = z.object({
	token: z.string(),
});

export const claimInviteResponseSchema = z.object({
	boardId: z.string(),
	alreadyMember: z.boolean(),
});

export const memberResponseSchema = z.object({
	id: z.string(),
	userId: z.string(),
	role: z.string(),
	joinedAt: z.date(),
});

export const memberListResponseSchema = z.array(memberResponseSchema);

export const snapshotResponseSchema = z.object({
	data: z.any().nullable(),
});
