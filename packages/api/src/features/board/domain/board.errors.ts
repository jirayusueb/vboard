import { TaggedError } from "better-result";

export class BoardNotFoundError extends TaggedError("BoardNotFound")<{
	boardId: string;
}>() {}

export class BoardAccessDeniedError extends TaggedError("BoardAccessDenied")<{
	boardId: string;
	userId?: string;
}>() {}

export class BoardForbiddenError extends TaggedError("BoardForbidden")<{
	boardId: string;
	userId: string;
	action: string;
}>() {}

export class InviteExpiredError extends TaggedError("InviteExpired")<{
	token: string;
}>() {}

export class InviteInvalidError extends TaggedError("InviteInvalid")<{
	token: string;
}>() {}

export class InviteAlreadyMemberError extends TaggedError(
	"InviteAlreadyMember",
)<{
	boardId: string;
	userId: string;
}>() {}

export class MemberIsOwnerError extends TaggedError("MemberIsOwner")<{
	boardId: string;
	userId: string;
}>() {}

export class OwnerRequiredError extends TaggedError("OwnerRequired")<{
	boardId: string;
	userId: string;
}>() {}

export type BoardError =
	| BoardNotFoundError
	| BoardAccessDeniedError
	| BoardForbiddenError
	| InviteExpiredError
	| InviteInvalidError
	| InviteAlreadyMemberError
	| MemberIsOwnerError
	| OwnerRequiredError;
