import { z } from "zod";

export const createBoardSchema = z.object({
	title: z.string().min(1).max(200),
	visibility: z.enum(["public", "private"]).optional(),
});

export const updateBoardSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	visibility: z.enum(["public", "private"]).optional(),
});

export const boardIdParamsSchema = z.object({
	id: z.string().min(1),
});

export const createInviteSchema = z.object({
	role: z.enum(["editor", "viewer"]),
});

export const inviteTokenParamsSchema = z.object({
	token: z.string().min(1),
});

export const removeMemberParamsSchema = z.object({
	id: z.string().min(1),
	userId: z.string().min(1),
});

export const transferOwnershipSchema = z.object({
	newOwnerId: z.string().min(1),
});

export type CreateBoardRequest = z.infer<typeof createBoardSchema>;
export type UpdateBoardRequest = z.infer<typeof updateBoardSchema>;
export type CreateInviteRequest = z.infer<typeof createInviteSchema>;
export type TransferOwnershipRequest = z.infer<typeof transferOwnershipSchema>;
