# Infrastructure Layer Conventions

The infrastructure layer implements the ports defined in the application layer. It contains all framework-specific code: Drizzle queries, DB mappers, and transaction management.

## Repository Pattern

Repositories implement port interfaces and use Drizzle ORM:

```ts
// features/board/infrastructure/repositories/drizzle-board.repository.ts

import type { IBoardRepository } from "../../application/ports/i-board.repository";
import type { BoardEntity } from "../../domain/entities/board.entity";
import type { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import { db } from "../../../../shared/infrastructure/database";
import { txStorage } from "../../../../shared/infrastructure/database/transaction-context";
import { board } from "@vboard/db/schema/board";
import { boardMember } from "@vboard/db/schema/board";
import { eq } from "drizzle-orm";
import { toBoardDomain } from "../mappers/board.mapper";
import { unbrand } from "../../../../shared/kernel/types";

export class DrizzleBoardRepository implements IBoardRepository {
  async findById(id: BoardIdVO): Promise<BoardEntity | null> {
    const rows = await this.getDb()
      .select()
      .from(board)
      .where(eq(board.id, unbrand(id)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return toBoardDomain(row); // Always use mapper
  }

  async create(boardEntity: BoardEntity): Promise<BoardEntity> {
    const rows = await this.getDb()
      .insert(board)
      .values({
        id: unbrand(boardEntity.id), // Unwrap branded type
        title: boardEntity.title,
        visibility: boardEntity.visibility.value as "public" | "private",
        ownerId: boardEntity.ownerId,
      })
      .returning();
    return toBoardDomain(rows[0]!); // Always use mapper
  }

  async update(boardEntity: BoardEntity): Promise<void> {
    await this.getDb()
      .update(board)
      .set({
        title: boardEntity.title,
        visibility: boardEntity.visibility.value as "public" | "private",
        updatedAt: boardEntity.updatedAt,
      })
      .where(eq(board.id, unbrand(boardEntity.id)));
  }

  async delete(id: BoardIdVO): Promise<void> {
    await this.getDb()
      .delete(board)
      .where(eq(board.id, unbrand(id)));
  }

  async listByUserId(userId: string): Promise<BoardEntity[]> {
    const rows = await this.getDb()
      .select({ board: board })
      .from(boardMember)
      .innerJoin(board, eq(boardMember.boardId, board.id))
      .where(eq(boardMember.userId, userId));
    return rows.map((r) => toBoardDomain(r.board));
  }

  async updateOwnerId(id: BoardIdVO, newOwnerId: string): Promise<void> {
    await this.getDb()
      .update(board)
      .set({ ownerId: newOwnerId })
      .where(eq(board.id, unbrand(id)));
  }

  /** Use transaction if in AsyncLocalStorage, otherwise use bare db */
  private getDb() {
    return txStorage.getStore() ?? db;
  }
}
```

### Key Rules

| Rule                                | Why                                                              |
| ----------------------------------- | ---------------------------------------------------------------- |
| **Class implements port interface** | `DrizzleBoardRepository implements IBoardRepository`             |
| **Always use `getDb()`**            | Picks up active transaction from `AsyncLocalStorage`             |
| **Always use mapper**               | `toBoardDomain(row)` converts DB rows → entities via `restore()` |
| **Unwrap branded types**            | `unbrand(id)` when passing to Drizzle queries                    |
| **Cast VO.value to DB enum**        | `visibility.value as "public" \| "private"`                      |
| **Import `db` from shared**         | `shared/infrastructure/database`, not `@vboard/db` directly      |
| **No business logic**               | Repos are pure data access — no auth checks, no validation       |

## Transaction Context

Repositories participate in transactions automatically via `AsyncLocalStorage`:

```ts
// shared/infrastructure/database/transaction-context.ts
import { AsyncLocalStorage } from "node:async_hooks";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const txStorage = new AsyncLocalStorage<Tx>();
```

```ts
// shared/infrastructure/database/drizzle-unit-of-work.ts
export class DrizzleUnitOfWork implements IUnitOfWork {
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => {
      return txStorage.run(tx, work);
    });
  }
}
```

**How it works**:

1. Use case calls `this.uow.runInTransaction(async () => { ... })`
2. `DrizzleUnitOfWork` starts a Drizzle transaction and stores the `tx` in `AsyncLocalStorage`
3. Any repository call inside the callback uses `getDb()` which checks `txStorage.getStore()`
4. If a tx exists, it's used; otherwise, bare `db` is used (for non-transactional queries)

## Mapper Pattern

Mappers convert raw DB rows to domain entities using `restore()`:

```ts
// features/board/infrastructure/mappers/board.mapper.ts
import { BoardEntity } from "../../domain/entities/board.entity";
import { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../domain/value-objects/board-visibility.vo";

type BoardRow = {
  id: string;
  title: string;
  visibility: "public" | "private";
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export function toBoardDomain(row: BoardRow): BoardEntity {
  return BoardEntity.restore(
    BoardIdVO.create(row.id),
    row.title,
    BoardVisibilityVO.fromString(row.visibility),
    row.ownerId,
    row.createdAt,
    row.updatedAt,
  );
}
```

### Rules

- Mappers are **standalone functions** (not classes) named `to*Domain`
- Always use `Entity.restore()` (not `create()`) — DB data is trusted
- Define a local `*Row` type matching the Drizzle query result shape
- Convert DB enum strings to VOs via `VO.fromString()`
- Convert raw strings to branded types via `VO.create()`

## Schema Re-exports

Each feature's infrastructure has a `schema/` directory that re-exports from `@vboard/db/schema`:

```ts
// features/board/infrastructure/schema/index.ts
export {
  board,
  boardMember,
  boardSnapshot,
  boardInvite,
  boardVisibilityEnum,
  memberRoleEnum,
} from "@vboard/db/schema/board";
```

This keeps the DB schema dependency in one place per feature.

## Database Import

Always import `db` from the shared infrastructure, not directly:

```ts
// ✅ Correct
import { db } from "../../../../shared/infrastructure/database";

// ❌ Wrong
import { db } from "@vboard/db";
```

This centralizes the DB client and makes it swappable for testing.
