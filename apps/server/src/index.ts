import { createApp } from "@vboard/api/bootstrap";
import { auth } from "@vboard/auth";
import { cors } from "@elysiajs/cors";
import { env } from "@vboard/env/server";
import { Elysia } from "elysia";
import { initLogger } from "evlog";
import {
	createAuthMiddleware,
	type BetterAuthInstance,
} from "evlog/better-auth";
import { evlog } from "evlog/elysia";

initLogger({
	env: { service: "vboard-server" },
});

const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
	exclude: ["/api/auth/**"],
	maskEmail: true,
});

const apiApp = createApp();

const app = new Elysia()
	.use(evlog())
	.derive(async ({ request, log }) => {
		await identifyUser(log, request.headers, new URL(request.url).pathname);
		return {};
	})
	// CORS with env-configured origin
	.use(
		cors({
			origin: env.CORS_ORIGIN,
			methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.use(apiApp)
	.listen(3000, () => {
		console.log("Server is running on http://localhost:3000");
	});

export type App = typeof app;
