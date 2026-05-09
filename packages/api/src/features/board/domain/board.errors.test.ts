import { describe, test, expect } from "vitest";
import {
	BoardNotFoundError,
	BoardAccessDeniedError,
	BoardForbiddenError,
	InviteExpiredError,
	InviteInvalidError,
	InviteAlreadyMemberError,
	MemberIsOwnerError,
	OwnerRequiredError,
} from "./board.errors";

describe("Board Errors", () => {
	test("BoardNotFoundError has correct _tag and payload", () => {
		const err = new BoardNotFoundError({ boardId: "b1" });
		expect(err._tag).toBe("BoardNotFound");
		expect(err.boardId).toBe("b1");
	});

	test("BoardAccessDeniedError has correct _tag and payload", () => {
		const err = new BoardAccessDeniedError({ boardId: "b1", userId: "u1" });
		expect(err._tag).toBe("BoardAccessDenied");
		expect(err.boardId).toBe("b1");
		expect(err.userId).toBe("u1");
	});

	test("BoardForbiddenError has correct _tag and payload", () => {
		const err = new BoardForbiddenError({
			boardId: "b1",
			userId: "u1",
			action: "update",
		});
		expect(err._tag).toBe("BoardForbidden");
		expect(err.action).toBe("update");
	});

	test("InviteExpiredError has correct _tag and payload", () => {
		const err = new InviteExpiredError({ token: "tok-1" });
		expect(err._tag).toBe("InviteExpired");
		expect(err.token).toBe("tok-1");
	});

	test("InviteInvalidError has correct _tag and payload", () => {
		const err = new InviteInvalidError({ token: "bad" });
		expect(err._tag).toBe("InviteInvalid");
	});

	test("InviteAlreadyMemberError has correct _tag and payload", () => {
		const err = new InviteAlreadyMemberError({ boardId: "b1", userId: "u1" });
		expect(err._tag).toBe("InviteAlreadyMember");
	});

	test("MemberIsOwnerError has correct _tag and payload", () => {
		const err = new MemberIsOwnerError({ boardId: "b1", userId: "u1" });
		expect(err._tag).toBe("MemberIsOwner");
	});

	test("OwnerRequiredError has correct _tag and payload", () => {
		const err = new OwnerRequiredError({ boardId: "b1", userId: "u1" });
		expect(err._tag).toBe("OwnerRequired");
	});
});
