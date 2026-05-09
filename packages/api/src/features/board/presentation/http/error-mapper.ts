/**
 * Type-safe error → HTTP response mapper for Board errors.
 * Uses exhaustive matching on BoardError._tag to ensure every error is handled.
 */
import type { BoardError } from "../../domain/board.errors";

export interface ErrorResponse {
	status: number;
	body: string | null;
}

/**
 * Map a BoardError to an HTTP status code and response body.
 * exhaustive switch ensures compile-time error if new error variants are added.
 */
export function mapBoardError(error: BoardError): ErrorResponse {
	switch (error._tag) {
		case "BoardNotFound":
			return { status: 404, body: null };

		case "BoardAccessDenied":
			return { status: 403, body: null };

		case "BoardForbidden":
			return { status: 403, body: null };

		case "InviteExpired":
			return { status: 410, body: "Invite expired" };

		case "InviteInvalid":
			return { status: 404, body: "Invite not found" };

		case "InviteAlreadyMember":
			return { status: 409, body: "Already a member" };

		case "MemberIsOwner":
			return { status: 400, body: "Cannot remove owner" };

		case "OwnerRequired":
			return { status: 403, body: "Owner permission required" };
	}
}
