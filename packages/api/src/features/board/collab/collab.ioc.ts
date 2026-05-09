/**
 * Collab module — Elysia plugin factory.
 * Wires up collab's own domain, application, and infrastructure layers.
 */
import Elysia from "elysia";
import type { IBoardRepository } from "../application/ports/i-board.repository";
import type { IBoardMemberRepository } from "../application/ports/i-board-member.repository";
import type { IBoardSnapshotRepository } from "../application/ports/i-board-snapshot.repository";
import { ConnectCollabCommand } from "./application/usecases/commands/connect-collab.command";
import { BoardAccessChecker } from "./infrastructure/board-access-checker";
import { CollabSnapshotRepository } from "./infrastructure/collab-snapshot.repository";
import { YjsDocRegistry } from "./infrastructure/yjs-doc-registry";
import { CollabService } from "./infrastructure/collab.service";
import { createCollabWsController } from "./presentation/collab-ws.controller";

export function createCollabModule(deps: {
	boardRepo: IBoardRepository;
	memberRepo: IBoardMemberRepository;
	snapshotRepo: IBoardSnapshotRepository;
}) {
	// Collab-specific adapters
	const collabSnapshotRepo = new CollabSnapshotRepository(deps.snapshotRepo);
	const accessChecker = new BoardAccessChecker(deps.boardRepo, deps.memberRepo);

	// Application layer
	const connectCommand = new ConnectCollabCommand(accessChecker);

	// Infrastructure layer
	const docRegistry = new YjsDocRegistry(collabSnapshotRepo);
	const collabService = new CollabService(connectCommand, docRegistry);
	collabService.start();

	// Presentation layer
	const collabWs = createCollabWsController(collabService);

	return new Elysia({ name: "collab-module" }).use(collabWs);
}
