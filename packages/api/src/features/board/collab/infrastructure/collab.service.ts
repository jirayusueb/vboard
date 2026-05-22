/**
 * CollabService — thin ICollabService implementation.
 * Authorization delegated to ConnectCollabCommand.
 * CRDT operations delegated to ILoroDocRegistry.
 */
import type { ICollabService } from "../application/ports/i-collab-service.port";
import type { ILoroDocRegistry } from "../application/ports/i-loro-doc-registry.port";
import type { WSContext } from "../application/ports/ws-context.port";
import type { ConnectCollabCommand } from "../application/usecases/commands/connect-collab.command";
import type { AccessLevel } from "../domain/value-objects/access-level.vo";
import { AccessLevel as AccessLevelVO } from "../domain/value-objects/access-level.vo";
import { getRawConn } from "../application/ports/ws-context.port";

export class CollabService implements ICollabService {
	private started = false;

	constructor(
		private readonly connectCommand: ConnectCollabCommand,
		private readonly docRegistry: ILoroDocRegistry,
	) {}

	start(): void {
		if (!this.started) {
			this.docRegistry.startSnapshotTimer();
			this.started = true;
		}
	}

	async handleConnection(
		ws: WSContext,
		boardId: string,
	): Promise<AccessLevel | null> {
		// Authorization via application use case
		const result = await this.connectCommand.execute({
			boardId,
			userId: ws.userId,
		});

		if (result.isErr()) {
			const conn = getRawConn(ws);
			conn.close(4403, result.error.message);
			return null;
		}

		const { accessLevel } = result.unwrap();
		const conn = getRawConn(ws);

		// Register with Loro doc registry
		await this.docRegistry.register(boardId, conn);

		// Store metadata on WSContext for message/close handlers
		ws.boardMeta = {
			boardId,
			userId: ws.userId,
			connectedAt: new Date(),
			readOnly: !AccessLevelVO.isEditor(accessLevel),
		};

		return accessLevel;
	}

	handleMessage(ws: WSContext, message: ArrayBuffer | Uint8Array): void {
		const meta = ws.boardMeta;
		if (!meta) return;

		const conn = getRawConn(ws);
		const data =
			message instanceof ArrayBuffer
				? new Uint8Array(message)
				: new Uint8Array(
						message.buffer,
						message.byteOffset,
						message.byteLength,
					);

		this.docRegistry.handleMessage(meta.boardId, conn, data, meta.readOnly);
	}

	handleDisconnect(ws: WSContext): void {
		const meta = ws.boardMeta;
		if (!meta) return;

		const conn = getRawConn(ws);
		this.docRegistry.disconnect(meta.boardId, conn);
	}
}
