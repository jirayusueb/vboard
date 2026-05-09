/**
 * Re-export Result types from better-result.
 * Centralized so all features use the same Result API.
 *
 * Usage: Result.ok(val), Result.err(e), Result.isError(r), Result.unwrap(r), Result.gen(fn)
 */
export {
	Result,
	Ok,
	Err,
	TaggedError,
	type TaggedErrorClass,
	type TaggedErrorInstance,
	isTaggedError,
} from "better-result";
