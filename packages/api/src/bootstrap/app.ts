import { auth } from "@vboard/auth";
import { Elysia } from "elysia";
import { authPlugin } from "../shared/presentation/plugins/auth.plugin";
import { createBoardModule } from "../features/board/board.ioc";
import { DrizzleUnitOfWork } from "../shared/infrastructure/database/drizzle-unit-of-work";
import { UuidV7Generator } from "../shared/infrastructure/ids/uuid-v7-generator";
import { RealDateProvider } from "../shared/infrastructure/date/real-date-provider";

/**
 * Creates the Elysia app with all global plugins and feature modules wired.
 * This is the main entry point exported from `@vboard/api`.
 *
 * CORS and evlog are NOT included here — the server app adds those.
 */
export function createApp() {
	const uow = new DrizzleUnitOfWork();
	const idGenerator = new UuidV7Generator();
	const dateProvider = new RealDateProvider();

	const boardModule = createBoardModule({
		uow,
		idGenerator,
		dateProvider,
	});

	const app = new Elysia()
		// Auth routes (public)
		.all("/api/auth/*", async ({ request }) => {
			if (["POST", "GET"].includes(request.method)) {
				return auth.handler(request);
			}
			return new Response(null, { status: 405 });
		})
		// Auth plugin (macros available for routes below)
		.use(authPlugin)
		// Feature modules
		.use(boardModule)
		// Root
		.get("/api/health", () => "OK");

	return app;
}
