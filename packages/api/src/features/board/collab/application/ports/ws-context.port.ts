/**
 * WSContext — typed abstraction over raw Bun WebSocket connections.
 * Provides type-safe access to metadata without `any` casts.
 */
export interface WSContext {
	/** Raw Bun WebSocket — for sending messages */
	readonly raw: unknown;
	/** The authenticated user ID, or null for anonymous connections */
	readonly userId: string | null;
	/** Board metadata attached during connection lifecycle */
	boardMeta: WSMeta | null;
}

export interface WSMeta {
	readonly boardId: string;
	readonly userId: string | null;
	readonly connectedAt: Date;
	readonly readOnly: boolean;
}

/**
 * Cast a WSContext's raw field to a WSConn-like type for Yjs registry interop.
 * This is safe because the controller always passes a real Bun ServerWebSocket.
 */
export function getRawConn(ws: WSContext): {
	readyState: number;
	send(data: Uint8Array): void;
	close(code?: number, reason?: string): void;
} {
	return ws.raw as {
		readyState: number;
		send(data: Uint8Array): void;
		close(code?: number, reason?: string): void;
	};
}
