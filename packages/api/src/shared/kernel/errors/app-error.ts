/**
 * Base application error class for cross-feature error handling.
 * Features should extend TaggedError from better-result for feature-specific errors.
 * This class exists for future cross-feature error scenarios.
 */
export class AppError {
	constructor(
		public readonly code: string,
		public readonly message: string,
		public readonly details?: Record<string, unknown>,
	) {}

	static validation(
		message: string,
		details?: Record<string, unknown>,
	): AppError {
		return new AppError("ValidationFailed", message, details);
	}

	static notFound(resource: string): AppError {
		return new AppError("NotFound", `${resource} not found`);
	}

	static unauthorized(message = "Unauthorized"): AppError {
		return new AppError("Unauthorized", message);
	}

	static conflict(message: string): AppError {
		return new AppError("Conflict", message);
	}

	static internal(message = "Internal Server Error"): AppError {
		return new AppError("InternalError", message);
	}
}
