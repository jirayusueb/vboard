/**
 * Logging interface — abstracts the logging implementation.
 * Infrastructure layer provides the concrete implementation (e.g., EvlogLogger).
 */
export interface ILogger {
	info(message: string, meta?: Record<string, unknown>): void;
	error(message: string, error?: Error, meta?: Record<string, unknown>): void;
	debug(message: string, meta?: Record<string, unknown>): void;
	warn(message: string, meta?: Record<string, unknown>): void;
}
