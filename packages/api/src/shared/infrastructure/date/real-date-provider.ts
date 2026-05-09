/**
 * Real date provider — wraps native Date for production use.
 * In tests, swap with a mock implementation of IDateProvider.
 */
import type { IDateProvider } from "../../application/interfaces/i-date-provider";

export class RealDateProvider implements IDateProvider {
	now(): Date {
		return new Date();
	}

	addSeconds(seconds: number, from?: Date): Date {
		const base = from ?? this.now();
		return new Date(base.getTime() + seconds * 1000);
	}

	addMinutes(minutes: number, from?: Date): Date {
		const base = from ?? this.now();
		return new Date(base.getTime() + minutes * 60 * 1000);
	}
}
