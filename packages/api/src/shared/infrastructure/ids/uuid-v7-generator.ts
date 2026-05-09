/**
 * UUIDv7-based ID generator — produces time-sortable UUIDs.
 * Better for database indexing than UUIDv4.
 */
import type { IIdGenerator } from "../../application/interfaces/i-id-generator";
import { uuidv7 } from "uuidv7";

export class UuidV7Generator implements IIdGenerator {
	generate(): string {
		return uuidv7();
	}
}
