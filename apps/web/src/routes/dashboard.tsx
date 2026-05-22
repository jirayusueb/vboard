import { createFileRoute, redirect } from "@tanstack/react-router";

import { getUser } from "@/features/auth/get-user";

const RouteComponent = () => {
	const { session } = Route.useRouteContext();

	return (
		<div>
			<h1>Dashboard</h1>
			<p>Welcome {session?.user.name}</p>
		</div>
	);
};

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	component: RouteComponent,
	loader: ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: "/login",
			});
		}
	},
});