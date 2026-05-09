/**
 * Collab domain errors — typed errors for the collaboration feature.
 */
import { TaggedError } from "better-result";

export class CollabBoardNotFoundError extends TaggedError(
	"CollabBoardNotFound",
)<{
	boardId: string;
}>() {}

export class CollabAccessDeniedError extends TaggedError("CollabAccessDenied")<{
	boardId: string;
	userId: string | null;
}>() {}

export type CollabError = CollabBoardNotFoundError | CollabAccessDeniedError;
