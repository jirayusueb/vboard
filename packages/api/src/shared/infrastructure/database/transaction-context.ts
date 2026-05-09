/**
 * Transaction context using AsyncLocalStorage for Drizzle transaction propagation.
 * Repositories check this store to determine if they're inside a transaction.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type { db } from "./index";

/** Drizzle transaction type inferred from db.transaction signature */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** AsyncLocalStorage that holds the current Drizzle transaction */
export const txStorage = new AsyncLocalStorage<Tx>();
