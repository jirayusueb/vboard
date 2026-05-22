/**
 * Thin Elysia WS route — delegates to ICollabService.
 * Constructs a typed WSContext from the Elysia WS object and stores it
 * on the raw WebSocket so subsequent message/close events can retrieve it.
 *
 * Bun's WebSocketHandler options:
 * - idleTimeout: close connections after 30s of inactivity (default 120s)
 * - sendPings: automatically send/reply to pings (default true)
 *   This provides built-in dead connection detection.
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
		// Dead connection detection: close after 30s of no activity
		idleTimeout: 30,

		async open(ws) {
			const boardId = ws.data.params.boardId;

			try {
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
			} catch (error) {
				console.error("WebSocket open failed", {
					boardId,
					error: error instanceof Error ? error.message : String(error),
				});
				ws.close(1011, "Internal server error");
			}
		},

		message(ws, message) {
			const ctx = getContext(ws.raw);
			if (!ctx) return;
			const data =
				message instanceof ArrayBuffer
					? message
					: (message as unknown as ArrayBuffer);
			try {
				collabService.handleMessage(ctx, data);
			} catch (error) {
				console.error("WebSocket message handler failed", {
					boardId: ws.data.params.boardId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		},

		close(ws) {
			const ctx = getContext(ws.raw);
			if (!ctx) return;
			try {
				collabService.handleDisconnect(ctx);
			} catch (error) {
				console.error("WebSocket close handler failed", {
					boardId: ws.data.params.boardId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
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
