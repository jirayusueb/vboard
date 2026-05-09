/**
 * Branded type helpers for type-safe identifiers.
 * Prevents accidental mixing of different ID types (e.g., BoardIdVO vs UserId).
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * Brand a raw value as a specific branded type.
 * Use at trust boundaries (e.g., reconstructing from DB, parsing from request).
 */
export function make<T extends Brand<string, string>>(value: string): T {
	return value as T;
}

/**
 * Unwrap a branded type back to its primitive.
 * Use when passing branded IDs to Drizzle queries or external APIs.
 */
export function unbrand<T extends Brand<string, string>>(branded: T): string {
	return branded as string;
}

/**
 * Base class for ID Value Objects.
 * Provides `create()` to brand a raw string and `unwrap()` to extract it.
 *
 * @example
 * ```ts
 * // Define a concrete ID VO:
 * export type TodoId = Brand<string, "TodoId">;
 * export const TodoIdVO = new IdVO<TodoId, "TodoId">("TodoId");
 *
 * // Usage:
 * const id = TodoIdVO.create("abc");   // TodoId
 * const raw = TodoIdVO.unwrap(id);     // string
 * ```
 */
export class IdVO<T extends Brand<string, B>, B extends string> {
	constructor(_tag: B) {
		// tag is for readability at construction site only;
		// the brand is enforced at the type level.
	}

	/** Brand a raw string into a typed ID. */
	create(value: string): T {
		return value as T;
	}

	/** Unwrap a branded ID back to its primitive string. */
	unwrap(branded: T): string {
		return branded as string;
	}
}
