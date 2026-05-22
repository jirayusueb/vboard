import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createMiddleware } from "@tanstack/react-start";
import { Toaster } from "@vboard/ui/components/sonner";
import { evlogErrorHandler } from "evlog/nitro/v3";

import type { QueryClient } from "@tanstack/react-query";
import { EdenProvider, edenClient, queryClient } from "@/shared/lib/eden";

import Header from "@/shared/components/header";

import appCss from "../index.css?url";

export interface RouterAppContext {
	queryClient: QueryClient;
}

const DevTools = () => {
	if (import.meta.env.DEV) {
		return (
			<>
				<TanStackRouterDevtools position="bottom-left" />
				<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
			</>
		);
	}
	return null;
};

const RootDocument = () => (
	<html lang="en" className="dark">
		<head>
			<HeadContent />
		</head>
		<body>
			<EdenProvider client={edenClient} queryClient={queryClient}>
				<div className="grid h-svh grid-rows-[auto_1fr]">
					<Header />
					<Outlet />
				</div>
				<Toaster richColors />
				<DevTools />
			</EdenProvider>
			<Scripts />
		</body>
	</html>
);

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootDocument,
	head: () => ({
		links: [
			{
				href: appCss,
				rel: "stylesheet",
			},
		],
		meta: [
			{
				charSet: "utf-8",
			},
			{
				content: "width=device-width, initial-scale=1",
				name: "viewport",
			},
			{
				title: "My App",
			},
		],
	}),
	server: {
		middleware: [createMiddleware().server(evlogErrorHandler)],
	},
});