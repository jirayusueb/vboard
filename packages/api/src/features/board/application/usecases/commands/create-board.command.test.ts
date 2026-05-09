import { describe, test, expect, beforeEach } from "vitest";
import { CreateBoardCommand } from "./create-board.command";
import { MockBoardRepository } from "../../__mocks__/mock-board.repository";
import { MockBoardMemberRepository } from "../../__mocks__/mock-board-member.repository";
import { MockUnitOfWork } from "../../__mocks__/mock-unit-of-work";
import { MockIdGenerator } from "../../__mocks__/mock-id-generator";
import { MockDateProvider } from "../../__mocks__/mock-date-provider";

describe("CreateBoardCommand", () => {
	let boardRepo: MockBoardRepository;
	let memberRepo: MockBoardMemberRepository;
	let command: CreateBoardCommand;

	beforeEach(() => {
		boardRepo = new MockBoardRepository();
		memberRepo = new MockBoardMemberRepository();
		command = new CreateBoardCommand(
			boardRepo,
			memberRepo,
			new MockUnitOfWork(),
			new MockIdGenerator(),
			new MockDateProvider(),
		);
	});

	test("creates board and adds owner as member", async () => {
		const result = await command.execute({
			title: "Test Board",
			visibility: "public",
			userId: "user-1",
		});
		expect(result.isOk()).toBe(true);
		const output = result.unwrap();
		expect(output.title).toBe("Test Board");
		expect(output.visibility).toBe("public");
		expect(output.ownerId).toBe("user-1");
	});

	test("defaults visibility to private when not specified", async () => {
		const result = await command.execute({
			title: "Private Board",
			userId: "user-1",
		});
		expect(result.isOk()).toBe(true);
		expect(result.unwrap().visibility).toBe("private");
	});

	test("rejects empty title", async () => {
		const result = await command.execute({
			title: "",
			userId: "user-1",
		});
		expect(result.isErr()).toBe(true);
	});
});
