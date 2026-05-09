import { createFileRoute } from "@tanstack/react-router";
import { useEden } from "../lib/eden";
import { useState } from "react";

export const Route = createFileRoute("/board")({
	component: BoardListPage,
});

function BoardListPage() {
	const eden = useEden();
	const [showCreate, setShowCreate] = useState(false);
	const [title, setTitle] = useState("");
	const [visibility, setVisibility] = useState<"public" | "private">("private");

	// Fetch user's boards
	const boardsQuery = eden.board.get.useQuery();
	const createMutation = eden.board.post.useMutation({
		onSuccess: () => {
			boardsQuery.refetch();
			setShowCreate(false);
			setTitle("");
			setVisibility("private");
		},
	});

	const boards = boardsQuery.data ?? [];

	return (
		<div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 24,
				}}
			>
				<h1 style={{ fontSize: 24, fontWeight: 600 }}>My Boards</h1>
				<button
					onClick={() => setShowCreate(true)}
					style={{
						padding: "8px 16px",
						background: "#6c5ce7",
						color: "white",
						border: "none",
						borderRadius: 6,
						cursor: "pointer",
					}}
				>
					+ New Board
				</button>
			</div>

			{/* Create board dialog */}
			{showCreate && (
				<div
					style={{
						border: "1px solid #ddd",
						borderRadius: 8,
						padding: 16,
						marginBottom: 24,
						background: "#fafafa",
					}}
				>
					<h3 style={{ marginBottom: 12 }}>Create New Board</h3>
					<div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
						<input
							type="text"
							placeholder="Board title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							style={{
								flex: 1,
								padding: "8px 12px",
								border: "1px solid #ddd",
								borderRadius: 6,
							}}
						/>
						<select
							value={visibility}
							onChange={(e) =>
								setVisibility(e.target.value as "public" | "private")
							}
							style={{
								padding: "8px 12px",
								border: "1px solid #ddd",
								borderRadius: 6,
							}}
						>
							<option value="private">Private</option>
							<option value="public">Public</option>
						</select>
					</div>
					<div style={{ display: "flex", gap: 8 }}>
						<button
							onClick={() =>
								createMutation.mutate({
									body: { title, visibility },
								})
							}
							disabled={!title.trim() || createMutation.isPending}
							style={{
								padding: "8px 16px",
								background: "#6c5ce7",
								color: "white",
								border: "none",
								borderRadius: 6,
								cursor:
									!title.trim() || createMutation.isPending
										? "not-allowed"
										: "pointer",
								opacity: !title.trim() || createMutation.isPending ? 0.5 : 1,
							}}
						>
							{createMutation.isPending ? "Creating..." : "Create"}
						</button>
						<button
							onClick={() => setShowCreate(false)}
							style={{
								padding: "8px 16px",
								background: "transparent",
								border: "1px solid #ddd",
								borderRadius: 6,
								cursor: "pointer",
							}}
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Board grid */}
			{boardsQuery.isLoading && <p>Loading boards...</p>}
			{boardsQuery.isError && (
				<p style={{ color: "red" }}>Error loading boards</p>
			)}
			{boards.length === 0 && !boardsQuery.isLoading && (
				<p style={{ color: "#888" }}>
					No boards yet. Create one to get started!
				</p>
			)}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
					gap: 16,
				}}
			>
				{boards.map((board: any) => (
					<a
						key={board.id}
						href={`/board/${board.id}`}
						style={{
							display: "block",
							border: "1px solid #e0e0e0",
							borderRadius: 8,
							padding: 16,
							textDecoration: "none",
							color: "inherit",
							transition: "box-shadow 0.15s",
						}}
						onMouseEnter={(e) =>
							(e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)")
						}
						onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
					>
						<h3 style={{ fontSize: 16, marginBottom: 8 }}>{board.title}</h3>
						<div style={{ display: "flex", gap: 6, alignItems: "center" }}>
							<span
								style={{
									fontSize: 11,
									padding: "2px 6px",
									borderRadius: 4,
									background:
										board.visibility === "public" ? "#e8f5e9" : "#e3f2fd",
									color: board.visibility === "public" ? "#2e7d32" : "#1565c0",
								}}
							>
								{board.visibility}
							</span>
						</div>
					</a>
				))}
			</div>
		</div>
	);
}
