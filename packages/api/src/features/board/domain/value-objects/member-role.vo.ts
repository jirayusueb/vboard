/**
 * MemberRoleVO — represents a user's role within a board.
 * Immutable, compared by value, encapsulates permission logic.
 */
export class MemberRoleVO {
	static readonly OWNER = new MemberRoleVO("owner");
	static readonly EDITOR = new MemberRoleVO("editor");
	static readonly VIEWER = new MemberRoleVO("viewer");

	private constructor(public readonly value: "owner" | "editor" | "viewer") {}

	/** Can modify board content (elements, assets). */
	get canEdit(): boolean {
		return this === MemberRoleVO.OWNER || this === MemberRoleVO.EDITOR;
	}

	/** Can manage board settings, members, invites. */
	get canManage(): boolean {
		return this === MemberRoleVO.OWNER;
	}

	equals(other: MemberRoleVO): boolean {
		return this.value === other.value;
	}

	static fromString(value: string): MemberRoleVO {
		switch (value) {
			case "owner":
				return MemberRoleVO.OWNER;
			case "editor":
				return MemberRoleVO.EDITOR;
			case "viewer":
				return MemberRoleVO.VIEWER;
			default:
				throw new Error(`Invalid MemberRole: ${value}`);
		}
	}

	toString(): string {
		return this.value;
	}
}
