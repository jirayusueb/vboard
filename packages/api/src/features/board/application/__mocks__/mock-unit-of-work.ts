import type { IUnitOfWork } from "../../../../shared/application/interfaces/i-unit-of-work";

export class MockUnitOfWork implements IUnitOfWork {
	async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
		return work();
	}
}
