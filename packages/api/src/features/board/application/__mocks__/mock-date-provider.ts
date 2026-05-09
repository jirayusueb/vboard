import type { IDateProvider } from "../../../../shared/application/interfaces/i-date-provider";

export class MockDateProvider implements IDateProvider {
	private _now: Date;

	constructor(initialDate = new Date("2025-01-01T00:00:00Z")) {
		this._now = initialDate;
	}

	now(): Date {
		return this._now;
	}

	addSeconds(seconds: number, from?: Date): Date {
		return new Date((from ?? this._now).getTime() + seconds * 1000);
	}

	addMinutes(minutes: number, from?: Date): Date {
		return new Date((from ?? this._now).getTime() + minutes * 60000);
	}

	/** Test helper: advance the internal clock by N minutes */
	advance(minutes: number): void {
		this._now = this.addMinutes(minutes);
	}
}
