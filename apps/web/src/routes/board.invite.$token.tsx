import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Spinner } from "@vboard/ui/components/spinner";

import { edenClient } from "@/shared/lib/eden";

const InviteClaimPage = () => {
	const { token } = Route.useParams();
	const navigate = useNavigate();
	const [claiming, setClaiming] = useState(true);
	const [inviteError, setInviteError] = useState<string | null>(null);

	useEffect(() => {
		const claimInvite = async () => {
			try {
				const result = await edenClient.board.invite({ token }).post();
				if (result.error) {
					const msg =
						typeof result.error.value === "string"
							? result.error.value
							: "Invalid invite";
					setInviteError(msg);
					setClaiming(false);
					return;
				}
				// Redirect to the board
				const data = result.data as { alreadyMember: boolean; boardId: string };
				navigate({ params: { boardId: data.boardId }, to: "/board/$boardId" });
			} catch (error: unknown) {
				setInviteError(error instanceof Error ? error.message : "Failed to claim invite");
				setClaiming(false);
			}
		};
		claimInvite();
	}, [token, navigate]);

	if (claiming) {
		return (
			<div className="flex h-screen items-center justify-center text-muted-foreground">
				<Spinner className="mr-2" />
				Accepting invite...
			</div>
		);
	}

	return (
		<div className="flex h-screen flex-col items-center justify-center gap-2">
			<h2 className="text-xl font-semibold text-destructive">Invite Error</h2>
			<p className="text-muted-foreground">{inviteError}</p>
			<Link to="/board" className="text-primary hover:underline">
				← Back to boards
			</Link>
		</div>
	);
};

export const Route = createFileRoute("/board/invite/$token")({
	component: InviteClaimPage,
});
