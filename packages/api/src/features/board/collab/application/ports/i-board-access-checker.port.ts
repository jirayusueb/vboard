/**
 * Port for board access authorization — decoupled from board repos.
 * Keeps collab's application layer independent of board's domain.
 */
import type { Result } from "better-result";
import type { AccessLevel } from "../../domain/value-objects/access-level.vo";
import type { CollabError } from "../../domain/collab.errors";

export interface IBoardAccessChecker {
	checkAccess(
		boardId: string,
		userId: string | null,
	): Promise<Result<AccessLevel, CollabError>>;
}
