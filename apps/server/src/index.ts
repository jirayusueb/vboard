import { cors } from "@elysiajs/cors";
import { createApp } from "@vboard/api/bootstrap";
import { auth } from "@vboard/auth";
import { env } from "@vboard/env/server";
import { Elysia } from "elysia";
import { initLogger } from "evlog";
import { createAuthMiddleware } from "evlog/better-auth";
import type { BetterAuthInstance } from "evlog/better-auth";
import { evlog } from "evlog/elysia";

initLogger({
  env: { service: "vboard-server" },
});

const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

const { app: apiApp, dispose: disposeApp } = createApp();

const app = new Elysia()
  .use(evlog())
  .derive(async ({ request, log }) => {
    await identifyUser(log, request.headers, new URL(request.url).pathname);
    return {};
  })
  // CORS with env-configured origin
  .use(
    cors({
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      origin: env.CORS_ORIGIN,
    })
  )
  // Security headers for production
  .onRequest(({ request, set }) => {
    if (env.NODE_ENV === "production") {
      set.headers["X-Content-Type-Options"] = "nosniff";
      set.headers["X-Frame-Options"] = "DENY";
      set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
      const proto = new URL(request.url).protocol;
      if (proto === "https:") {
        set.headers["Strict-Transport-Security"] =
          "max-age=31536000; includeSubDomains";
      }
    }
  })
  // Global error handler — catch unhandled errors and return structured JSON
  .onError(({ code, error, set }) => {
    const isProd = env.NODE_ENV === "production";
    if (code === "VALIDATION") {
      set.status = 400;
      return { error: "Validation failed", details: error.message };
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not found" };
    }
    console.error("[server] Unhandled error", {
      code,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    set.status = 500;
    return {
      error: isProd ? "Internal Server Error" : (error instanceof Error ? error.message : "Internal Server Error"),
    };
  })
  .use(apiApp)
  .listen(env.PORT, () => {
    console.log(`[server] Running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

export type App = typeof app;

// ── Graceful Shutdown ───────────────────────────────────────────────────

const shutdownTimeout = 10_000; // 10 seconds max for shutdown
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[server] Received ${signal}, starting graceful shutdown...`);

  // Set a hard timeout — force exit if shutdown takes too long
  const forceExit = setTimeout(() => {
    console.error("[server] Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, shutdownTimeout);

  try {
    // 1. Stop accepting new connections — Elysia's stop() closes the listener
    await app.stop();

    // 2. Persist all in-memory Loro docs to DB
    console.log("[server] Persisting in-memory documents...");
    await disposeApp();

    console.log("[server] Graceful shutdown complete");
  } catch (error) {
    console.error("[server] Error during graceful shutdown", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(forceExit);
    process.exit(0);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
