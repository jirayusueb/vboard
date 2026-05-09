import Elysia from "elysia";
import { DrizzleBoardRepository } from "./infrastructure/repositories/drizzle-board.repository";
import { DrizzleBoardMemberRepository } from "./infrastructure/repositories/drizzle-board-member.repository";
import { DrizzleBoardSnapshotRepository } from "./infrastructure/repositories/drizzle-board-snapshot.repository";
import { DrizzleBoardInviteRepository } from "./infrastructure/repositories/drizzle-board-invite.repository";
import { GetBoardQuery } from "./application/usecases/queries/get-board.query";
import { ListUserBoardsQuery } from "./application/usecases/queries/list-user-boards.query";
import { GetBoardSnapshotQuery } from "./application/usecases/queries/get-board-snapshot.query";
import { ListMembersQuery } from "./application/usecases/queries/list-members.query";
import { CreateBoardCommand } from "./application/usecases/commands/create-board.command";
import { UpdateBoardCommand } from "./application/usecases/commands/update-board.command";
import { DeleteBoardCommand } from "./application/usecases/commands/delete-board.command";
import { CreateInviteCommand } from "./application/usecases/commands/create-invite.command";
import { ClaimInviteCommand } from "./application/usecases/commands/claim-invite.command";
import { RemoveMemberCommand } from "./application/usecases/commands/remove-member.command";
import { TransferOwnershipCommand } from "./application/usecases/commands/transfer-ownership.command";
import { createBoardController } from "./presentation/http/board.controller";
import { createCollabModule } from "./collab/collab.ioc";
import type { IUnitOfWork } from "../../shared/application/interfaces/i-unit-of-work";
import type { IIdGenerator } from "../../shared/application/interfaces/i-id-generator";
import type { IDateProvider } from "../../shared/application/interfaces/i-date-provider";

/**
 * Board feature module — Elysia plugin factory.
 * Wires up all repositories, use cases, collab module, and controllers.
 */
export function createBoardModule(deps: {
	uow: IUnitOfWork;
	idGenerator: IIdGenerator;
	dateProvider: IDateProvider;
}) {
	// Repositories
	const boardRepo = new DrizzleBoardRepository();
	const memberRepo = new DrizzleBoardMemberRepository();
	const snapshotRepo = new DrizzleBoardSnapshotRepository();
	const inviteRepo = new DrizzleBoardInviteRepository();

	// Queries
	const getBoard = new GetBoardQuery(boardRepo, memberRepo);
	const listUserBoards = new ListUserBoardsQuery(boardRepo);
	const getBoardSnapshot = new GetBoardSnapshotQuery(
		snapshotRepo,
		boardRepo,
		memberRepo,
	);
	const listMembers = new ListMembersQuery(memberRepo, boardRepo);

	// Commands
	const createBoard = new CreateBoardCommand(
		boardRepo,
		memberRepo,
		deps.uow,
		deps.idGenerator,
		deps.dateProvider,
	);
	const updateBoard = new UpdateBoardCommand(boardRepo, deps.dateProvider);
	const deleteBoard = new DeleteBoardCommand(boardRepo);
	const createInvite = new CreateInviteCommand(
		boardRepo,
		inviteRepo,
		deps.idGenerator,
		deps.dateProvider,
	);
	const claimInvite = new ClaimInviteCommand(
		inviteRepo,
		memberRepo,
		deps.uow,
		deps.idGenerator,
		deps.dateProvider,
	);
	const removeMember = new RemoveMemberCommand(boardRepo, memberRepo);
	const transferOwnership = new TransferOwnershipCommand(
		boardRepo,
		memberRepo,
		deps.uow,
	);

	// Board HTTP controller
	const boardController = createBoardController({
		getBoard,
		listUserBoards,
		getBoardSnapshot,
		listMembers,
		createBoard,
		updateBoard,
		deleteBoard,
		createInvite,
		claimInvite,
		removeMember,
		transferOwnership,
	});

	// Collab sub-module (self-contained)
	const collabModule = createCollabModule({
		boardRepo,
		memberRepo,
		snapshotRepo,
	});

	return new Elysia({ name: "board-module" })
		.use(boardController)
		.use(collabModule);
}
