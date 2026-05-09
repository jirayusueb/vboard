/**
 * ConnectCollabCommand — application use case that checks board access
 * and returns the granted access level for a collab session.
 */
import type { CollabError } from "../../../domain/collab.errors";
import type { ConnectInput, ConnectOutput } from "../../collab.dtos";
import type { IBoardAccessChecker } from "../../ports/i-board-access-checker.port";
import { Result } from "better-result";

export class ConnectCollabCommand {
	constructor(private readonly accessChecker: IBoardAccessChecker) {}

	async execute(
		input: ConnectInput,
	): Promise<Result<ConnectOutput, CollabError>> {
		const result = await this.accessChecker.checkAccess(
			input.boardId,
			input.userId,
		);
		if (result.isErr()) {
			return Result.err(result.error);
		}
		return Result.ok({ accessLevel: result.unwrap() });
	}
}
