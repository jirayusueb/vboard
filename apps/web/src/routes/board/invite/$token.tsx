import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { edenClient } from "../../../lib/eden";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/board/invite/$token")({
	component: InviteClaimPage,
});

function InviteClaimPage() {
	const { token } = Route.useParams();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [claiming, setClaiming] = useState(true);

	useEffect(() => {
		async function claimInvite() {
			try {
				const result = await edenClient.board.invite({ token }).post();
				if (result.error) {
					const msg =
						typeof result.error.value === "string"
							? result.error.value
							: "Invalid invite";
					setError(msg);
					setClaiming(false);
					return;
				}
				// Redirect to the board
				const data = result.data as { boardId: string; alreadyMember: boolean };
				navigate({ to: "/board/$boardId", params: { boardId: data.boardId } });
			} catch (e: unknown) {
				setError(e instanceof Error ? e.message : "Failed to claim invite");
				setClaiming(false);
			}
		}
		claimInvite();
	}, [token]);

	if (claiming) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100vh",
					color: "#666",
				}}
			>
				Accepting invite...
			</div>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				height: "100vh",
			}}
		>
			<h2 style={{ color: "#c62828" }}>Invite Error</h2>
			<p>{error}</p>
			<a href="/board" style={{ color: "#6c5ce7", marginTop: 12 }}>
				← Back to boards
			</a>
		</div>
	);
}
