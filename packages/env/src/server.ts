import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    DB_POOL_IDLE_TIMEOUT: z.coerce.number().int().min(1).max(300).default(30),
    DB_POOL_CONNECT_TIMEOUT: z.coerce.number().int().min(1).max(60).default(10),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
