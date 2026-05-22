import { auth } from "@vboard/auth";
import { closeDb, db } from "@vboard/db";
import { env } from "@vboard/env/server";
import { Elysia } from "elysia";

import { createBoardModule } from "../features/board/board.ioc";
import { DrizzleBoardInviteRepository } from "../features/board/infrastructure/repositories/drizzle-board-invite.repository";
import { DrizzleUnitOfWork } from "../shared/infrastructure/database/drizzle-unit-of-work";
import { RealDateProvider } from "../shared/infrastructure/date/real-date-provider";
import { UuidV7Generator } from "../shared/infrastructure/ids/uuid-v7-generator";
import { authPlugin } from "../shared/presentation/plugins/auth.plugin";
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
    dateProvider,
    idGenerator,
    uow,
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
    .use(boardModule.plugin)
    // Health check — includes DB connectivity test
    .get("/api/health", async () => {
      let dbOk = false;
      try {
        await db.execute({ sql: "SELECT 1", args: [] } as any);
        dbOk = true;
      } catch (error) {
        console.error("[health-check] DB connection failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return {
        status: dbOk ? "ok" : "degraded",
        db: dbOk,
        env: env.NODE_ENV,
        timestamp: new Date().toISOString(),
      };
    });

  // ── Background Jobs ──────────────────────────────────────────────

  // Clean up expired invites every 10 minutes
  const inviteRepo = new DrizzleBoardInviteRepository();
  const inviteCleanupTimer = setInterval(async () => {
    try {
      const deleted = await inviteRepo.deleteExpired();
      if (deleted > 0) {
        console.log("[cleanup] Removed expired invites", { deleted });
      }
    } catch (error) {
      console.error("[cleanup] Invite cleanup job failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, 10 * 60_000);

  return {
    app,
    dispose: async () => {
      clearInterval(inviteCleanupTimer);
      await boardModule.dispose();
      await closeDb();
    },
  };
}
