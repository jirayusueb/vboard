/**
 * Drizzle-based Unit of Work implementation.
 * Wraps db.transaction() and propagates the transaction via AsyncLocalStorage
 * so repositories automatically participate in the active transaction.
 */
import type { IUnitOfWork } from "../../application/interfaces/i-unit-of-work";
import { db } from "./index";
import { txStorage } from "./transaction-context";

export class DrizzleUnitOfWork implements IUnitOfWork {
	async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
		return db.transaction(async (tx) => {
			return txStorage.run(tx, work);
		});
	}
}
