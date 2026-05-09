import type {
	GetBoardOutput,
	ListUserBoardsOutput,
	ListMembersOutput,
	CreateBoardOutput,
	CreateInviteOutput,
	ClaimInviteOutput,
} from "../../../application/board.dtos";

export function toGetBoardResponse(output: GetBoardOutput): GetBoardOutput {
	return output;
}

export function toBoardListResponse(
	output: ListUserBoardsOutput,
): ListUserBoardsOutput {
	return output;
}

export function toMemberListResponse(
	output: ListMembersOutput,
): ListMembersOutput {
	return output;
}

export function toCreateBoardResponse(
	output: CreateBoardOutput,
): CreateBoardOutput {
	return output;
}

export function toInviteResponse(
	output: CreateInviteOutput,
): CreateInviteOutput {
	return output;
}

export function toClaimInviteResponse(
	output: ClaimInviteOutput,
): ClaimInviteOutput {
	return output;
}
