# Testing Conventions

## Framework & Setup

- **Vitest** — test runner with `globals: true`
- Config: `packages/api/vitest.config.ts`
- Test pattern: `src/**/*.test.ts`

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

## Test Co-location

Test files live **next to the source file** they test:

```
features/board/domain/entities/
├── board.entity.ts
├── board.entity.test.ts        ← Co-located
├── board-member.entity.ts
├── board-member.entity.test.ts ← Co-located
```

## Test Structure

```ts
import { describe, test, expect } from "vitest";
import { BoardEntity } from "./board.entity";
import { BoardIdVO } from "../value-objects/board-id.vo";
import { BoardVisibilityVO } from "../value-objects/board-visibility.vo";

const now = new Date("2025-01-01");

describe("BoardEntity", () => {
  describe("create", () => {
    test("creates a valid board", () => {
      const result = BoardEntity.create(
        BoardIdVO.create("b1"),
        "My Board",
        BoardVisibilityVO.PUBLIC,
        "user-1",
        now,
      );
      expect(result.isOk()).toBe(true);
      const board = result.unwrap();
      expect(board.title).toBe("My Board");
      expect(board.visibility).toBe(BoardVisibilityVO.PUBLIC);
      expect(board.ownerId).toBe("user-1");
    });

    test("rejects empty title", () => {
      const result = BoardEntity.create(
        BoardIdVO.create("b1"),
        "",
        BoardVisibilityVO.PRIVATE,
        "user-1",
        now,
      );
      expect(result.isErr()).toBe(true);
    });
  });

  describe("updateTitle", () => {
    test("updates title and timestamp", () => {
      const board = BoardEntity.restore(
        BoardIdVO.create("b1"),
        "Old",
        BoardVisibilityVO.PRIVATE,
        "user-1",
        now,
        now,
      );
      const later = new Date("2025-01-02");
      board.updateTitle("New", later);
      expect(board.title).toBe("New");
      expect(board.updatedAt).toBe(later);
    });
  });
});
```

### Test Naming

- **`describe("EntityName")`** — groups tests by class/type
- **`describe("methodName")`** — nested group for specific method
- **`test("does X when Y")`** — descriptive sentence, no "should"

### Test Fixtures

Use fixed values, not dynamic ones:

```ts
const now = new Date("2025-01-01"); // Fixed date, not new Date()
const boardId = BoardIdVO.create("b1"); // Known ID, not crypto.randomUUID()
```

For use case tests, use mock providers:

```ts
const mockDateProvider = { now: () => new Date("2025-01-01"), addSeconds: ..., addMinutes: ... };
const mockIdGenerator = { generate: () => "generated-id" };
```

## Mock Pattern

Mocks implement port interfaces with in-memory stores:

```ts
// features/board/application/__mocks__/mock-board.repository.ts
import type { IBoardRepository } from "../ports/i-board.repository";
import type { BoardEntity } from "../../domain/entities/board.entity";
import type { BoardIdVO } from "../../domain/value-objects/board-id.vo";

export class MockBoardRepository implements IBoardRepository {
  private boards: Map<string, BoardEntity> = new Map();

  async findById(id: BoardIdVO): Promise<BoardEntity | null> {
    return this.boards.get(id as string) ?? null;
  }

  async create(board: BoardEntity): Promise<BoardEntity> {
    this.boards.set(board.id as string, board);
    return board;
  }

  async update(board: BoardEntity): Promise<void> {
    this.boards.set(board.id as string, board);
  }

  async delete(id: BoardIdVO): Promise<void> {
    this.boards.delete(id as string);
  }

  async listByUserId(_userId: string): Promise<BoardEntity[]> {
    return Array.from(this.boards.values());
  }

  async updateOwnerId(id: BoardIdVO, newOwnerId: string): Promise<void> {
    const board = this.boards.get(id as string);
    if (board) {
      // @ts-expect-error — ownerId is readonly but we need this for transfer
      board.ownerId = newOwnerId;
    }
  }
}
```

### Mock Location

```
features/board/application/
├── __mocks__/
│   ├── mock-board.repository.ts
│   ├── mock-board-member.repository.ts
│   ├── mock-board-invite.repository.ts
│   ├── mock-board-snapshot.repository.ts
│   ├── mock-id-generator.ts
│   ├── mock-date-provider.ts
│   └── mock-unit-of-work.ts
├── ports/
├── usecases/
└── board.dtos.ts
```

Mocks live in `__mocks__/` under the `application/` directory (same level as the ports they implement).

## Coverage Configuration

```ts
// vitest.config.ts
coverage: {
  provider: "v8",
  include: [
    "src/features/board/domain/**",
    "src/features/board/application/**",
  ],
  exclude: [
    "src/features/**/index.ts",           // Barrel files
    "src/**/__mocks__/**",                // Mocks themselves
    "src/**/dtos.ts",                     // Pure type definitions
    "src/**/ports/**",                    // Interfaces (no logic)
  ],
  thresholds: {
    lines: 80,
    branches: 80,
    functions: 80,
    statements: 80,
  },
},
```

### What to Test

| Layer                        | Test?          | How                                                         |
| ---------------------------- | -------------- | ----------------------------------------------------------- |
| **Domain entities**          | ✅ Always      | Unit tests — `create()`, `restore()`, mutations, edge cases |
| **Domain VOs**               | ✅ Always      | Unit tests — `fromString()`, equality, permissions          |
| **Domain errors**            | Optional       | Usually covered via entity/use case tests                   |
| **Application use cases**    | ✅ Recommended | Mock repos, test business orchestration                     |
| **Infrastructure repos**     | ❌ Skip        | Need real DB — cover with integration tests separately      |
| **Presentation controllers** | ❌ Skip        | Thin delegation — cover with E2E tests                      |

## Shared Test Utilities

### Mock Providers

```ts
// features/board/application/__mocks__/mock-id-generator.ts
export class MockIdGenerator implements IIdGenerator {
  private counter = 0;
  generate(): string {
    return `mock-id-${++this.counter}`;
  }
}
```

```ts
// features/board/application/__mocks__/mock-date-provider.ts
export class MockDateProvider implements IDateProvider {
  constructor(private readonly fixedDate: Date = new Date("2025-01-01")) {}
  now(): Date {
    return this.fixedDate;
  }
  addSeconds(s: number, from?: Date): Date {
    return new Date((from ?? this.fixedDate).getTime() + s * 1000);
  }
  addMinutes(m: number, from?: Date): Date {
    return new Date((from ?? this.fixedDate).getTime() + m * 60 * 1000);
  }
}
```

```ts
// features/board/application/__mocks__/mock-unit-of-work.ts
export class MockUnitOfWork implements IUnitOfWork {
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return work(); // Just execute — no real transaction
  }
}
```

## Running Tests

```bash
# All tests
bun run test

# Specific file
bun vitest run src/features/board/domain/entities/board.entity.test.ts

# Watch mode
bun vitest

# Coverage report
bun run test:coverage
```

## Collab Module Testing

The `features/board/collab/` submodule follows the same clean-arch testing strategy:

| Layer          | File                                                           | What to test                                   |
| -------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| Domain         | `domain/value-objects/access-level.vo.test.ts`                 | `fromBoolean()`, `isEditor()`, constants       |
| Domain         | `domain/collab.errors.test.ts`                                 | Error `_tag`, payload properties               |
| Application    | `application/usecases/commands/connect-collab.command.test.ts` | Access granted/denied, board not found         |
| Infrastructure | `infrastructure/board-access-checker.test.ts`                  | Public/private + member/anonymous permutations |

**Not tested** (Yjs internals, thin wrappers):

- `infrastructure/yjs-doc-registry.ts` — deep Yjs/lib0 internals
- `infrastructure/collab.service.ts` — thin WS lifecycle wrapper
- `infrastructure/collab-snapshot.repository.ts` — delegates to Drizzle
- `presentation/collab-ws.controller.ts` — Elysia WS handler

### Collab mock pattern

The `ConnectCollabCommand` test uses an inline mock for `IBoardAccessChecker`:

```ts
class MockBoardAccessChecker implements IBoardAccessChecker {
  private result: Result<AccessLevel, CollabError> = Result.ok(
    "EDITOR" as AccessLevel,
  );

  setResult(result: Result<AccessLevel, CollabError>) {
    this.result = result;
  }

  async checkAccess(_boardId: string, _userId: string | null) {
    return this.result;
  }
}
```

The `BoardAccessChecker` infrastructure test reuses the shared mock repos from `application/__mocks__/`.

## Architecture Dependency Rules

`src/architecture-dependency-rules.test.ts` enforces clean-arch boundaries at the import level:

- Domain → no outward imports
- Application → domain only
- Infrastructure → no presentation
- Presentation → no infrastructure
- Shared kernel → no features
