/**
 * ILogger implementation wrapping evlog.
 * Uses evlog's default log export for structured logging.
 */
import type { ILogger } from "../../application/interfaces/i-logger";
import { log } from "evlog";

export class EvlogLogger implements ILogger {
	info(message: string, meta?: Record<string, unknown>): void {
		log.info(message, meta);
	}

	error(message: string, error?: Error, meta?: Record<string, unknown>): void {
		log.error(message, { error, ...meta });
	}

	debug(message: string, meta?: Record<string, unknown>): void {
		log.debug(message, meta);
	}

	warn(message: string, meta?: Record<string, unknown>): void {
		log.warn(message, meta);
	}
}
