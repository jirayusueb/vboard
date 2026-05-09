import { createFileRoute } from "@tanstack/react-router";
import { useEden } from "../../lib/eden";
import { ExcalidrawWrapper } from "../../components/excalidraw-wrapper";

export const Route = createFileRoute("/board/$boardId")({
	component: BoardEditorPage,
});

function BoardEditorPage() {
	const { boardId } = Route.useParams();
	const eden = useEden();

	// Fetch board metadata
	const boardQuery = eden.board({ id: boardId }).get.useQuery();

	if (boardQuery.isLoading) {
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
				Loading board...
			</div>
		);
	}

	if (boardQuery.isError) {
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					height: "100vh",
					color: "#c62828",
				}}
			>
				<h2>Board not found</h2>
				<p>This board may not exist or you don't have access.</p>
				<a href="/board" style={{ color: "#6c5ce7", marginTop: 12 }}>
					← Back to boards
				</a>
			</div>
		);
	}

	const board = boardQuery.data;
	const readOnly = board.role === "viewer";

	return (
		<div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
			{/* Title bar */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "6px 12px",
					borderBottom: "1px solid #e0e0e0",
					background: "#fafafa",
					flexShrink: 0,
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<a
						href="/board"
						style={{ color: "#666", textDecoration: "none", fontSize: 13 }}
					>
						← Boards
					</a>
					<span style={{ color: "#ccc" }}>|</span>
					<span style={{ fontWeight: 500, fontSize: 14 }}>{board.title}</span>
					<span
						style={{
							fontSize: 10,
							padding: "1px 5px",
							borderRadius: 3,
							background: board.visibility === "public" ? "#e8f5e9" : "#e3f2fd",
							color: board.visibility === "public" ? "#2e7d32" : "#1565c0",
						}}
					>
						{board.visibility}
					</span>
					{readOnly && (
						<span
							style={{
								fontSize: 10,
								padding: "1px 5px",
								borderRadius: 3,
								background: "#fff3e0",
								color: "#e65100",
							}}
						>
							Read-only
						</span>
					)}
				</div>
			</div>

			{/* Canvas */}
			<div style={{ flex: 1 }}>
				<ExcalidrawWrapper boardId={boardId} readOnly={readOnly} />
			</div>
		</div>
	);
}
