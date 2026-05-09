/**
 * Port for the collaboration service — thin orchestrator for WebSocket lifecycle.
 * Authorization is handled by ConnectCollabCommand (application use case).
 * Yjs operations are delegated to IYDocRegistry.
 */
import type { WSContext } from "./ws-context.port";
import type { AccessLevel } from "../../domain/value-objects/access-level.vo";

export interface ICollabService {
	/** Start background services (snapshot timer). Call once at boot. */
	start(): void;

	/** Handle new WS connection — returns the granted access level or closes the connection */
	handleConnection(ws: WSContext, boardId: string): Promise<AccessLevel | null>;

	/** Handle incoming binary message */
	handleMessage(ws: WSContext, message: ArrayBuffer | Uint8Array): void;

	/** Handle disconnection */
	handleDisconnect(ws: WSContext): void;
}
