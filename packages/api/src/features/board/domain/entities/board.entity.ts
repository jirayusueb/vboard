/**
 * BoardEntity — aggregate root for the Board feature.
 * Factory methods: create() validates new boards, restore() trusts DB data.
 * Mutations are pure (no auth checks — authorization is a use-case concern).
 */
import type { BoardIdVO } from "../value-objects/board-id.vo";
import type { BoardVisibilityVO } from "../value-objects/board-visibility.vo";
import { Result } from "better-result";

export class BoardEntity {
	private constructor(
		public readonly id: BoardIdVO,
		public title: string,
		public visibility: BoardVisibilityVO,
		public readonly ownerId: string,
		public readonly createdAt: Date,
		public updatedAt: Date,
	) {}

	/**
	 * Create a new board — validates inputs.
	 */
	static create(
		id: BoardIdVO,
		title: string,
		visibility: BoardVisibilityVO,
		ownerId: string,
		now: Date,
	): Result<BoardEntity, string> {
		if (!title || title.trim().length === 0) {
			return Result.err("Title is required");
		}
		if (!ownerId) {
			return Result.err("Owner ID is required");
		}
		return Result.ok(
			new BoardEntity(id, title.trim(), visibility, ownerId, now, now),
		);
	}

	/**
	 * Restore from persistence — trusts DB data, no validation.
	 */
	static restore(
		id: BoardIdVO,
		title: string,
		visibility: BoardVisibilityVO,
		ownerId: string,
		createdAt: Date,
		updatedAt: Date,
	): BoardEntity {
		return new BoardEntity(
			id,
			title,
			visibility,
			ownerId,
			createdAt,
			updatedAt,
		);
	}

	/** Query — use cases check this to enforce authorization */
	isOwnedBy(userId: string): boolean {
		return this.ownerId === userId;
	}

	/** Pure mutation — no auth check, use case enforces ownership */
	updateTitle(title: string, now: Date): void {
		this.title = title;
		this.updatedAt = now;
	}

	/** Pure mutation — no auth check, use case enforces ownership */
	changeVisibility(visibility: BoardVisibilityVO, now: Date): void {
		this.visibility = visibility;
		this.updatedAt = now;
	}
}
