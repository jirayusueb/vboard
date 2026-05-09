/**
 * Collab DTOs — application-layer input/output for collab use cases.
 */
import type { AccessLevel } from "../domain/value-objects/access-level.vo";

export interface ConnectInput {
	boardId: string;
	userId: string | null;
}

export interface ConnectOutput {
	accessLevel: AccessLevel;
}
