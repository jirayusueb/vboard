import { treaty } from "@elysiajs/eden";
import { createEdenTanStackQuery } from "eden-tanstack-react-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { env } from "@vboard/env/web";
import { toast } from "sonner";

// Import App type from the server workspace for end-to-end type safety.
import type { App } from "@vboard/server";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			toast.error(`Error: ${error.message}`, {
				action: {
					label: "retry",
					onClick: query.invalidate,
				},
			});
		},
	}),
});

export const edenClient = treaty<App>(env.VITE_SERVER_URL);

export const { EdenProvider, useEden, useEdenClient } =
	createEdenTanStackQuery<App>();
