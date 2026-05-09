import type { IIdGenerator } from "../../../../shared/application/interfaces/i-id-generator";

export class MockIdGenerator implements IIdGenerator {
	private counter = 0;

	generate(): string {
		this.counter++;
		return `id-${this.counter}`;
	}
}
