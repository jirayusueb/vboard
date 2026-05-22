import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@vboard/ui/components/alert";
import { Badge } from "@vboard/ui/components/badge";
import { Separator } from "@vboard/ui/components/separator";
import { Spinner } from "@vboard/ui/components/spinner";

import { ExcalidrawWrapper } from "@/features/board/excalidraw-wrapper";
import { useEden } from "@/shared/lib/eden";

const BoardEditorPage = () => {
  const { boardId } = Route.useParams();
  const eden = useEden();

  // Fetch board metadata
  const boardQuery = useQuery(eden.board({ id: boardId }).get.queryOptions());

  if (boardQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Spinner className="mr-2" />
        <span>Loading board...</span>
      </div>
    );
  }

  if (boardQuery.isError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Board not found</AlertTitle>
          <AlertDescription>
            This board may not exist or you don&apos;t have access.
          </AlertDescription>
        </Alert>
        <Link to="/board" className="mt-2 text-primary hover:underline">
          ← Back to boards
        </Link>
      </div>
    );
  }

  const board = boardQuery.data;
  if (!board || board instanceof Response) {
    return null;
  }

  const readOnly = board.role === "viewer";

  return (
    <div className="flex h-screen flex-col">
      {/* Title bar */}
      <div className="flex shrink-0 items-center justify-between border-b bg-muted/50 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Link
            to="/board"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Boards
          </Link>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium">{board.title}</span>
          <Badge variant="secondary">{board.visibility}</Badge>
          {readOnly && (
            <Badge variant="outline" className="text-orange-500">
              Read-only
            </Badge>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ExcalidrawWrapper boardId={boardId} readOnly={readOnly} />
      </div>
    </div>
  );
};

export const Route = createFileRoute("/board/$boardId")({
  component: BoardEditorPage,
});
