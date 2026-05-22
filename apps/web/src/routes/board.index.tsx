import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Alert, AlertDescription } from "@vboard/ui/components/alert";
import { Badge } from "@vboard/ui/components/badge";
import { Button } from "@vboard/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@vboard/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@vboard/ui/components/dialog";
import { Empty, EmptyDescription, EmptyTitle } from "@vboard/ui/components/empty";
import { Input } from "@vboard/ui/components/input";
import { Label } from "@vboard/ui/components/label";
import { Skeleton } from "@vboard/ui/components/skeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@vboard/ui/components/select";
import { PlusIcon } from "lucide-react";

import { useEden } from "@/shared/lib/eden";

const BoardListPage = () => {
	const eden = useEden();
	const queryClient = useQueryClient();
	const [showCreate, setShowCreate] = useState(false);
	const [title, setTitle] = useState("");
	const [visibility, setVisibility] = useState<"public" | "private">("private");

	// Fetch user's boards
	const boardsQuery = useQuery(eden.board.get.queryOptions());
	const createMutation = useMutation({
		...eden.board.post.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: eden.board.get.queryKey() });
			setShowCreate(false);
			setTitle("");
			setVisibility("private");
		},
	});

	const boards =
		(Array.isArray(boardsQuery.data) ? boardsQuery.data : []) ?? [];

	return (
		<div className="mx-auto max-w-4xl px-6 py-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-semibold">My Boards</h1>
				<Button variant="default" size="sm" onClick={() => setShowCreate(true)}>
					<PlusIcon />
					New Board
				</Button>
			</div>

			{/* Create board dialog */}
			<Dialog open={showCreate} onOpenChange={setShowCreate}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Board</DialogTitle>
						<DialogDescription>
							Give your board a title and choose its visibility.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<div className="space-y-2">
							<Label htmlFor="board-title">Title</Label>
							<Input
								id="board-title"
								type="text"
								placeholder="Board title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Visibility</Label>
							<Select
								value={visibility}
								onValueChange={(v) =>
									setVisibility(v as "public" | "private")
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="private">Private</SelectItem>
									<SelectItem value="public">Public</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="default"
							disabled={!title.trim() || createMutation.isPending}
							onClick={() => createMutation.mutate({ title, visibility })}
						>
							{createMutation.isPending ? "Creating..." : "Create"}
						</Button>
						<Button variant="outline" onClick={() => setShowCreate(false)}>
							Cancel
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Board grid */}
			{boardsQuery.isLoading && <Skeleton className="h-4 w-32" />}
			{boardsQuery.isError && (
				<Alert variant="destructive">
					<AlertDescription>Error loading boards</AlertDescription>
				</Alert>
			)}
			{boards.length === 0 && !boardsQuery.isLoading && (
				<Empty>
					<EmptyTitle>No boards yet</EmptyTitle>
					<EmptyDescription>
						Create one to get started!
					</EmptyDescription>
				</Empty>
			)}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{boards.map(
					(board: { id: string; title: string; visibility: string }) => (
						<Link
							key={board.id}
							to="/board/$boardId"
							params={{ boardId: board.id }}
							className="transition-shadow hover:shadow-sm"
						>
							<Card>
								<CardHeader>
									<CardTitle>{board.title}</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex items-center gap-2">
										<Badge variant="secondary">
											{board.visibility}
										</Badge>
									</div>
								</CardContent>
							</Card>
						</Link>
					),
				)}
			</div>
		</div>
	);
};

export const Route = createFileRoute("/board/")({
	component: BoardListPage,
});
