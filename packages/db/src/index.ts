import { env } from "@vboard/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Logger } from "drizzle-orm/logger";

import * as schema from "./schema";

/**
 * Development logger — logs all SQL queries with timing.
 */
class DevQueryLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    const timestamp = new Date().toISOString();
    const paramStr = params.length > 0
      ? ` | params: ${JSON.stringify(params)}`
      : "";
    console.log(`[${timestamp}] [db:query] ${query}${paramStr}`);
  }
}

let poolInstance: Pool | null = null;

export function createDb() {
  const isDev = env.NODE_ENV === "development";

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT * 1000,
    connectionTimeoutMillis: env.DB_POOL_CONNECT_TIMEOUT * 1000,
  });

  poolInstance = pool;

  // Log pool-level errors (connection failures, unexpected closures)
  pool.on("error", (err) => {
    console.error("[db:pool] Unexpected connection error:", {
      message: err.message,
      code: (err as Error & { code?: string }).code,
    });
  });

  // Log when pool connects successfully (once, on first client acquisition)
  pool.on("connect", () => {
    if (isDev) {
      console.log("[db:pool] New client connected to database");
    }
  });

  // Log when pool removes an idle client
  pool.on("remove", () => {
    if (isDev) {
      console.log("[db:pool] Idle client removed from pool");
    }
  });

  return drizzle(pool, {
    schema,
    logger: isDev ? new DevQueryLogger() : false,
  });
}

export const db = createDb();

/**
 * Close the database connection pool. Call during graceful shutdown.
 */
export async function closeDb(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}
