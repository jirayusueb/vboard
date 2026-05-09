/**
 * Date/time provider interface — abstracts time for deterministic testing.
 * Entities and use cases should use this instead of `new Date()` directly.
 */
export interface IDateProvider {
	now(): Date;
	addSeconds(seconds: number, from?: Date): Date;
	addMinutes(minutes: number, from?: Date): Date;
}
