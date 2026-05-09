/**
 * Thin Elysia WS route — delegates to ICollabService.
 * Constructs a typed WSContext from the Elysia WS object and stores it
 * on the raw WebSocket so subsequent message/close events can retrieve it.
 */
import Elysia from "elysia";
import { auth } from "@vboard/auth";
import type { ICollabService } from "../application/ports/i-collab-service.port";
import type { WSContext } from "../application/ports/ws-context.port";

/**
 * Property key used to attach WSContext to the raw Bun WebSocket.
 * Bridges Elysia's WS lifecycle (open/message/close) with our typed context.
 */
const WS_CONTEXT_KEY = Symbol.for("vboard:wsContext");

export function createCollabWsController(collabService: ICollabService) {
	return new Elysia().ws("/ws/collab/:boardId", {
		async open(ws) {
			const boardId = ws.data.params.boardId;

			// Authenticate via session cookie
			const session = await auth.api.getSession({
				headers: ws.data.headers,
			});

			// Build typed WSContext
			const ctx: WSContext = {
				raw: ws.raw,
				userId: session?.user?.id ?? null,
				boardMeta: null,
			};

			// Attach to raw ws so message/close can retrieve it
			attachContext(ws.raw, ctx);

			await collabService.handleConnection(ctx, boardId);
		},

		message(ws, message) {
			const ctx = getContext(ws.raw);
			if (!ctx) return;
			const data =
				message instanceof ArrayBuffer
					? message
					: (message as unknown as ArrayBuffer);
			collabService.handleMessage(ctx, data);
		},

		close(ws) {
			const ctx = getContext(ws.raw);
			if (!ctx) return;
			collabService.handleDisconnect(ctx);
		},
	});
}

function attachContext(raw: unknown, ctx: WSContext): void {
	(raw as Record<symbol, unknown>)[WS_CONTEXT_KEY] = ctx;
}

function getContext(raw: unknown): WSContext | null {
	return (
		((raw as Record<symbol, unknown>)[WS_CONTEXT_KEY] as WSContext) ?? null
	);
}
