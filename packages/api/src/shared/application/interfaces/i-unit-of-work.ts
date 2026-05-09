/**
 * Unit of Work interface — defines transactional boundaries.
 * Use cases use this to wrap multi-repository operations in a single transaction.
 * Infrastructure provides the concrete implementation (e.g., DrizzleUnitOfWork).
 */
export interface IUnitOfWork {
	runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}
