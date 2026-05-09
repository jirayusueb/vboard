/**
 * Port for Yjs document registry — manages in-memory Y.Doc instances.
 * Abstracts away the Yjs library details from the application layer.
 */

export interface WSConn {
	readyState: number;
	send(data: Uint8Array): void;
	close(code?: number, reason?: string): void;
}

export interface IYDocRegistry {
	/** Register a connection for a board's doc and send initial sync */
	register(boardId: string, conn: WSConn): void;

	/** Process an incoming message for a connection */
	handleMessage(
		boardId: string,
		conn: WSConn,
		data: Uint8Array,
		readOnly: boolean,
	): void;

	/** Unregister a connection and clean up */
	disconnect(boardId: string, conn: WSConn): void;

	/** Start the periodic snapshot timer (call once) */
	startSnapshotTimer(): void;
}
