/**
 * AccessLevel — value object representing a user's permission level
 * in a collaborative editing session.
 */
export type AccessLevel = "READ_ONLY" | "EDITOR";

export const AccessLevel = {
	READ_ONLY: "READ_ONLY" as const,
	EDITOR: "EDITOR" as const,

	fromBoolean(canEdit: boolean): AccessLevel {
		return canEdit ? "EDITOR" : "READ_ONLY";
	},

	isEditor(level: AccessLevel): boolean {
		return level === "EDITOR";
	},
};
