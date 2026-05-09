import Elysia from "elysia";
import { Err, Ok } from "better-result";

function isResult(value: unknown): boolean {
	return value instanceof Ok || value instanceof Err;
}

/**
 * Result plugin — auto-unwraps Result<T,E> values from route handlers.
 * - Ok → returns the inner value
 * - Err → returns error details as HTTP error response
 *
 * If the Result carries an error with an `httpStatus` property, that status code is used.
 * Otherwise, defaults to 500 for errors.
 */
export const resultPlugin = new Elysia({ name: "result" }).mapResponse(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Elysia mapResponse context is intentionally generic
	(context: any) => {
		const { response, set } = context;

		// Check if it's a Result instance
		if (isResult(response)) {
			if (response.isOk()) {
				return response.unwrap();
			}

			// Access .error on Err variant
			const err = response.error;
			const status =
				typeof err === "object" && err !== null && "httpStatus" in err
					? (err as { httpStatus: number }).httpStatus
					: 500;
			set.status = status;
			return {
				error:
					typeof err === "object" && err !== null && "_tag" in err
						? (err as { _tag: string })._tag
						: "UnknownError",
				message:
					typeof err === "object" && err !== null && "message" in err
						? (err as { message: string }).message
						: String(err),
			};
		}
		return response;
	},
);
