import { Elysia } from "elysia";
import { auth } from "@vboard/auth";

/**
 * Auth plugin using Elysia macros for type-safe route-level auth.
 *
 * Usage on routes:
 *   .get("/protected", ({ session }) => ..., { auth: true })
 *   .get("/optional", ({ session }) => ..., { resolveSession: true })
 *
 * The object-shorthand macro pattern correctly propagates context types
 * to route handlers.
 */
export const authPlugin = new Elysia({ name: "auth" }).macro({
	/**
	 * Resolve the current session from request headers (nullable).
	 * Use on routes that work for both logged-in and anonymous users.
	 */
	resolveSession: {
		resolve: async ({ request }) => {
			const session = await auth.api.getSession({
				headers: request.headers,
			});
			return { session };
		},
	},

	/**
	 * Require authentication. Returns 401 if no session found.
	 * Session is guaranteed non-null in the route handler.
	 */
	auth: {
		beforeHandle: async ({ request }) => {
			const session = await auth.api.getSession({
				headers: request.headers,
			});

			if (!session?.user) {
				return new Response("Unauthorized", { status: 401 });
			}
		},
		resolve: async ({ request }) => {
			const session = await auth.api.getSession({
				headers: request.headers,
			});
			// Non-null assertion: beforeHandle already returns 401 if no session
			return { session: session! };
		},
	},
});
