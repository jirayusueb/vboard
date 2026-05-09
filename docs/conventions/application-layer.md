# Application Layer Conventions

The application layer orchestrates business use cases. It depends on the domain layer and defines **ports** (interfaces) that infrastructure must implement. It never directly accesses databases or HTTP.

## Port Pattern (Repository Interfaces)

Ports define the contract that infrastructure must implement:

```ts
// features/board/application/ports/i-board.repository.ts
import type { BoardEntity } from "../../domain/entities/board.entity";
import type { BoardIdVO } from "../../domain/value-objects/board-id.vo";

export interface IBoardRepository {
  findById(id: BoardIdVO): Promise<BoardEntity | null>;
  create(board: BoardEntity): Promise<BoardEntity>;
  update(board: BoardEntity): Promise<void>;
  delete(id: BoardIdVO): Promise<void>;
  listByUserId(userId: string): Promise<BoardEntity[]>;
  updateOwnerId(id: BoardIdVO, newOwnerId: string): Promise<void>;
}
```

### Rules

- **`I` prefix** on all port interface names (`IBoardRepository`, `ILogger`)
- Methods accept and return **domain entities**, never DB rows
- Return `Promise<Entity | null>` for finds, `Promise<void>` for mutations
- Use `Entity` parameter (not raw fields) for create/update — the entity already validated data

## DTO Pattern

DTOs define the input/output shapes for use cases — plain interfaces, no Zod (that's transport layer):

```ts
// features/board/application/board.dtos.ts
export interface GetBoardInput {
  boardId: string;
  userId?: string;
}

export interface GetBoardOutput {
  id: string;
  title: string;
  visibility: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  role: string | null;
}

export interface CreateBoardInput {
  title: string;
  visibility?: string;
  userId: string;
}

export interface CreateBoardOutput {
  id: string;
  title: string;
  visibility: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Rules

- `*Input` suffix for use case parameters
- `*Output` suffix for use case return data
- Fields are **primitives** (`string`, `boolean`, `Date`, `number`) — not domain types
- All DTOs for a feature go in a single `{feature}.dtos.ts` file

## Use Case Pattern

### Structure

```ts
// features/board/application/usecases/commands/create-board.command.ts

import type { BoardError } from "../../../domain/board.errors";
import type { CreateBoardInput, CreateBoardOutput } from "../../board.dtos";
import type { IBoardRepository } from "../../ports/i-board.repository";
import type { IBoardMemberRepository } from "../../ports/i-board-member.repository";
import type { IUnitOfWork } from "../../../../../shared/application/interfaces/i-unit-of-work";
import type { IIdGenerator } from "../../../../../shared/application/interfaces/i-id-generator";
import type { IDateProvider } from "../../../../../shared/application/interfaces/i-date-provider";
import { Result } from "better-result";
import { unbrand } from "../../../../../shared/kernel/types";
import { BoardEntity } from "../../../domain/entities/board.entity";
import { BoardMemberEntity } from "../../../domain/entities/board-member.entity";
import { BoardIdVO } from "../../../domain/value-objects/board-id.vo";
import { BoardVisibilityVO } from "../../../domain/value-objects/board-visibility.vo";
import { MemberRoleVO } from "../../../domain/value-objects/member-role.vo";

export class CreateBoardCommand {
  constructor(
    private readonly boardRepo: IBoardRepository,
    private readonly memberRepo: IBoardMemberRepository,
    private readonly uow: IUnitOfWork,
    private readonly idGenerator: IIdGenerator,
    private readonly dateProvider: IDateProvider,
  ) {}

  async execute(
    input: CreateBoardInput,
  ): Promise<Result<CreateBoardOutput, BoardError>> {
    // ... implementation
  }
}
```

### CQRS: Queries vs Commands

| Aspect              | Query                         | Command                                   |
| ------------------- | ----------------------------- | ----------------------------------------- |
| **Directory**       | `usecases/queries/`           | `usecases/commands/`                      |
| **Suffix**          | `*Query`                      | `*Command`                                |
| **Purpose**         | Read data                     | Mutate state                              |
| **UoW**             | Never                         | Only when multi-repo atomic writes needed |
| **Entity creation** | Never calls `Entity.create()` | Calls `Entity.create()` for new entities  |
| **Auth checks**     | Yes (can this user view?)     | Yes (can this user mutate?)               |

### Constructor Injection

Use cases receive all dependencies via constructor:

```ts
constructor(
  private readonly boardRepo: IBoardRepository,       // Port interface, not Drizzle class
  private readonly memberRepo: IBoardMemberRepository,
  private readonly uow: IUnitOfWork,                   // Only for commands
  private readonly idGenerator: IIdGenerator,           // For generating IDs
  private readonly dateProvider: IDateProvider,          // For deterministic time
) {}
```

- All constructor params are `private readonly`
- Use **port interfaces**, never concrete implementations
- Shared interfaces come from `shared/application/interfaces/`

## Result Handling

Use cases always return `Result<Output, Error>`:

```ts
async execute(input: GetBoardInput): Promise<Result<GetBoardOutput, BoardError>> {
  const board = await this.boardRepo.findById(boardId);
  if (!board) {
    return Result.err(new BoardNotFoundError({ boardId: input.boardId }));
  }

  return Result.ok({ id: unbrand(board.id), ... });
}
```

### Rules

- **Never throw exceptions** from use cases — always return `Result`
- Use `Result.err(new SpecificError({ payload }))` for failures
- Use `Result.ok(output)` for success
- Static import: `import { Result } from "better-result"` (no dynamic import needed)
- Use `unbrand()` to unwrap branded types in output: `unbrand(board.id)`

## Unit of Work (UoW)

Use `IUnitOfWork.runInTransaction()` when a command needs **atomic multi-repo writes**:

```ts
// Transactional: create board + add owner as member
return this.uow.runInTransaction(async () => {
  const board = await this.boardRepo.create(boardResult.unwrap());

  const member = BoardMemberEntity.create(/* ... */);
  if (member.isOk()) {
    await this.memberRepo.add(member.unwrap());
  }

  return Result.ok({ ... });
});
```

### When to use UoW

| Scenario                                          | Use UoW? |
| ------------------------------------------------- | -------- |
| Create board + add owner member (2 repos)         | ✅ Yes   |
| Update board title (1 repo)                       | ❌ No    |
| Transfer ownership (update role + update ownerId) | ✅ Yes   |
| Claim invite (add member + delete invite)         | ✅ Yes   |
| Delete board (1 repo, cascade handles members)    | ❌ No    |

## Shared Interfaces

Cross-cutting interfaces live in `shared/application/interfaces/`:

| Interface       | Purpose                     | Implementation             |
| --------------- | --------------------------- | -------------------------- |
| `ILogger`       | Logging abstraction         | `EvlogLogger`              |
| `IIdGenerator`  | ID creation                 | `UuidV7Generator` (UUIDv7) |
| `IDateProvider` | Time abstraction (testable) | `RealDateProvider`         |
| `IUnitOfWork`   | Transaction boundary        | `DrizzleUnitOfWork`        |
