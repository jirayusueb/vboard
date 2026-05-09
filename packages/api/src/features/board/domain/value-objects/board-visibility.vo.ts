/**
 * BoardVisibilityVO — controls who can view a board.
 * Immutable, compared by value.
 */
export class BoardVisibilityVO {
	static readonly PUBLIC = new BoardVisibilityVO("public");
	static readonly PRIVATE = new BoardVisibilityVO("private");

	private constructor(public readonly value: "public" | "private") {}

	get isPublic(): boolean {
		return this === BoardVisibilityVO.PUBLIC;
	}

	get isPrivate(): boolean {
		return this === BoardVisibilityVO.PRIVATE;
	}

	equals(other: BoardVisibilityVO): boolean {
		return this.value === other.value;
	}

	static fromString(value: string): BoardVisibilityVO {
		switch (value) {
			case "public":
				return BoardVisibilityVO.PUBLIC;
			case "private":
				return BoardVisibilityVO.PRIVATE;
			default:
				throw new Error(`Invalid BoardVisibility: ${value}`);
		}
	}

	toString(): string {
		return this.value;
	}
}
