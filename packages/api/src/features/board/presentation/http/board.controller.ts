import Elysia from "elysia";
import { authPlugin } from "../../../../shared/presentation/plugins/auth.plugin";
import type {
	GetBoardQuery,
	ListUserBoardsQuery,
	GetBoardSnapshotQuery,
	ListMembersQuery,
} from "../../application/usecases/queries";
import type {
	CreateBoardCommand,
	UpdateBoardCommand,
	DeleteBoardCommand,
	CreateInviteCommand,
	ClaimInviteCommand,
	RemoveMemberCommand,
	TransferOwnershipCommand,
} from "../../application/usecases/commands";
import {
	createBoardSchema,
	updateBoardSchema,
	createInviteSchema,
	transferOwnershipSchema,
} from "./dtos/board-request.dto";
import { mapBoardError } from "./error-mapper";

/**
 * Thin Elysia controller — delegates all logic to use cases.
 * Uses authPlugin macros for auth and Zod schemas for validation.
 */
export function createBoardController(deps: {
	getBoard: GetBoardQuery;
	listUserBoards: ListUserBoardsQuery;
	getBoardSnapshot: GetBoardSnapshotQuery;
	listMembers: ListMembersQuery;
	createBoard: CreateBoardCommand;
	updateBoard: UpdateBoardCommand;
	deleteBoard: DeleteBoardCommand;
	createInvite: CreateInviteCommand;
	claimInvite: ClaimInviteCommand;
	removeMember: RemoveMemberCommand;
	transferOwnership: TransferOwnershipCommand;
}) {
	return (
		new Elysia({ prefix: "/board" })
			.use(authPlugin)

			// ── Public/semi-public routes ──────────────────────────────
			.get(
				"/:id",
				async ({ params, session }) => {
					const result = await deps.getBoard.execute({
						boardId: params.id,
						userId: session?.user?.id,
					});
					if (result.isErr()) {
						const { status, body } = mapBoardError(result.error);
						return new Response(body, { status });
					}
					return result.unwrap();
				},
				{ resolveSession: true },
			)

			.get(
				"/:id/snapshot",
				async ({ params, session }) => {
					const result = await deps.getBoardSnapshot.execute({
						boardId: params.id,
						userId: session?.user?.id,
					});
					if (result.isErr()) {
						const { status, body } = mapBoardError(result.error);
						return new Response(body, { status });
					}
					const { data } = result.unwrap();
					if (!data) return { data: null };
					return new Response(data, {
						headers: { "Content-Type": "application/octet-stream" },
					});
				},
				{ resolveSession: true },
			)

			// ── Protected routes ───────────────────────────────────────
			.get(
				"/",
				async ({ session }) => {
					const result = await deps.listUserBoards.execute({
						userId: session.user.id,
					});
					if (result.isErr()) {
						const { status, body } = mapBoardError(result.error);
						return new Response(body, { status });
					}
					return result.unwrap().boards;
				},
				{ auth: true },
			)

			.post(
				"/",
				async ({ body, session }) => {
					const result = await deps.createBoard.execute({
						title: body.title,
						visibility: body.visibility,
						userId: session.user.id,
					});
					if (result.isErr()) {
						const { status, body: errBody } = mapBoardError(result.error);
						return new Response(errBody, { status });
					}
					return result.unwrap();
				},
				{
					auth: true,
					body: createBoardSchema,
				},
			)

			.patch(
				"/:id",
				async ({ params, body, session }) => {
					const result = await deps.updateBoard.execute({
						boardId: params.id,
						title: body.title,
						visibility: body.visibility,
						userId: session.user.id,
					});
					if (result.isErr()) {
						const { status, body: errBody } = mapBoardError(result.error);
						return new Response(errBody, { status });
					}
					return { ok: true };
				},
				{
					auth: true,
					body: updateBoardSchema,
				},
			)

			.delete(
				"/:id",
				async ({ params, session }) => {
					const result = await deps.deleteBoard.execute({
						boardId: params.id,
						userId: session.user.id,
					});
					if (result.isErr()) {
						const { status, body } = mapBoardError(result.error);
						return new Response(body, { status });
					}
					return { ok: true };
				},
				{ auth: true },
			)

			// ── Invites ────────────────────────────────────────────────
			.post(
				"/:id/invite",
				async ({ params, body, session }) => {
					const result = await deps.createInvite.execute({
						boardId: params.id,
						role: body.role,
						userId: session.user.id,
					});
					if (result.isErr()) {
						const { status, body: errBody } = mapBoardError(result.error);
						return new Response(errBody, { status });
					}
					return result.unwrap();
				},
				{
					auth: true,
					body: createInviteSchema,
				},
			)

			.post(
				"/invite/:token",
				async ({ params, session }) => {
					const result = await deps.claimInvite.execute({
						token: params.token,
						userId: session.user.id,
					});
					if (result.isErr()) {
						const { status, body } = mapBoardError(result.error);
						return new Response(body, { status });
					}
					return result.unwrap();
				},
				{ auth: true },
			)

			// ── Members ────────────────────────────────────────────────
			.get(
				"/:id/members",
				async ({ params, session }) => {
					const result = await deps.listMembers.execute({
						boardId: params.id,
						userId: session.user.id,
					});
					if (result.isErr()) {
						const { status, body } = mapBoardError(result.error);
						return new Response(body, { status });
					}
					return result.unwrap().members;
				},
				{ auth: true },
			)

			.delete(
				"/:id/members/:userId",
				async ({ params, session }) => {
					const result = await deps.removeMember.execute({
						boardId: params.id,
						targetUserId: params.userId,
						userId: session.user.id,
					});
					if (result.isErr()) {
						const { status, body } = mapBoardError(result.error);
						return new Response(body, { status });
					}
					return { ok: true };
				},
				{ auth: true },
			)

			.post(
				"/:id/transfer",
				async ({ params, body, session }) => {
					const result = await deps.transferOwnership.execute({
						boardId: params.id,
						newOwnerId: body.newOwnerId,
						userId: session.user.id,
					});
					if (result.isErr()) {
						const { status, body: errBody } = mapBoardError(result.error);
						return new Response(errBody, { status });
					}
					return { ok: true };
				},
				{
					auth: true,
					body: transferOwnershipSchema,
				},
			)
	);
}
