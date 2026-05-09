import { describe, test, expect } from "vitest";
import { BoardSnapshotEntity } from "./board-snapshot.entity";
import { BoardIdVO } from "../value-objects/board-id.vo";

describe("BoardSnapshotEntity", () => {
	test("restore creates a snapshot with all fields", () => {
		const data = Buffer.from("test-data");
		const createdAt = new Date("2025-01-01");
		const snapshot = BoardSnapshotEntity.restore(
			1,
			BoardIdVO.create("b1"),
			data,
			createdAt,
		);

		expect(snapshot.id).toBe(1);
		expect(snapshot.boardId as string).toBe("b1");
		expect(snapshot.data).toBe(data);
		expect(snapshot.createdAt).toBe(createdAt);
	});
});
