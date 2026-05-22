import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import "./index.css";
import Loader from "@/shared/components/loader";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "@/shared/lib/eden";

function NotFound() {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 p-8">
			<h1 className="text-4xl font-bold">404</h1>
			<p className="text-muted-foreground">Page not found</p>
			<a
				href="/"
				className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Go home
			</a>
		</div>
	);
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 p-8">
			<h1 className="text-4xl font-bold">Something went wrong</h1>
			<p className="max-w-md text-center text-muted-foreground">
				{error.message || "An unexpected error occurred."}
			</p>
			<button
				type="button"
				onClick={reset}
				className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Try again
			</button>
		</div>
	);
}

export const getRouter = () => {
	const router = createTanStackRouter({
		context: { queryClient },
		defaultNotFoundComponent: NotFound,
		errorComponent: ErrorComponent,
		defaultPendingComponent: () => <Loader />,
		defaultPreloadStaleTime: 0,
		routeTree,
		scrollRestoration: true,
	});

	setupRouterSsrQueryIntegration({
		queryClient,
		router,
	});

	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}