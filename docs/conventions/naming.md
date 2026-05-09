# Naming Conventions

## File Naming

All files use **kebab-case** with a **type suffix** indicating the file's role:

| Pattern                        | Example                               | Purpose                               |
| ------------------------------ | ------------------------------------- | ------------------------------------- |
| `{name}.entity.ts`             | `board.entity.ts`                     | Domain entity                         |
| `{name}.vo.ts`                 | `board-id.vo.ts`, `member-role.vo.ts` | Value object                          |
| `{name}.errors.ts`             | `board.errors.ts`                     | Feature-specific TaggedErrors         |
| `i-{name}.repository.ts`       | `i-board.repository.ts`               | Repository port (interface)           |
| `{name}.dtos.ts`               | `board.dtos.ts`                       | Application-layer DTOs                |
| `{name}.query.ts`              | `get-board.query.ts`                  | Read-only use case                    |
| `{name}.command.ts`            | `create-board.command.ts`             | Write/mutation use case               |
| `{name}.mapper.ts`             | `board.mapper.ts`                     | DB row → domain mapper                |
| `drizzle-{name}.repository.ts` | `drizzle-board.repository.ts`         | Drizzle repository implementation     |
| `{name}-request.dto.ts`        | `board-request.dto.ts`                | Zod request schemas                   |
| `{name}-response.dto.ts`       | `board-response.dto.ts`               | Zod response schemas                  |
| `{name}.controller.ts`         | `board.controller.ts`                 | Elysia route handler                  |
| `{name}.ioc.ts`                | `board.ioc.ts`                        | DI wiring / plugin factory            |
| `{name}.plugin.ts`             | `auth.plugin.ts`                      | Elysia plugin                         |
| `{name}.test.ts`               | `board.entity.test.ts`                | Co-located test file                  |
| `mock-{name}.ts`               | `mock-board.repository.ts`            | Mock implementation (in `__mocks__/`) |

## Type & Class Naming

| Category               | Convention          | Example                                                    |
| ---------------------- | ------------------- | ---------------------------------------------------------- |
| Entity                 | `*Entity` suffix    | `BoardEntity`, `TodoEntity`                                |
| Value Object (class)   | `*VO` suffix        | `BoardVisibilityVO`, `MemberRoleVO`                        |
| Value Object (branded) | `*VO` suffix        | `BoardIdVO`, `InviteTokenVO`                               |
| Error                  | `*Error` suffix     | `BoardNotFoundError`, `InviteExpiredError`                 |
| Error union            | `{Feature}Error`    | `BoardError`                                               |
| Port (interface)       | `I` prefix          | `IBoardRepository`, `ILogger`, `IUnitOfWork`               |
| DTO input              | `*Input` suffix     | `CreateBoardInput`, `GetBoardInput`                        |
| DTO output             | `*Output` suffix    | `CreateBoardOutput`, `GetBoardOutput`                      |
| Use case (query)       | `*Query` suffix     | `GetBoardQuery`, `ListMembersQuery`                        |
| Use case (command)     | `*Command` suffix   | `CreateBoardCommand`, `DeleteBoardCommand`                 |
| Mock                   | `Mock*` prefix      | `MockBoardRepository`, `MockIdGenerator`                   |
| Zod schema             | `*Schema` suffix    | `createBoardSchema`, `updateBoardSchema`                   |
| Zod type               | `*Request` suffix   | `CreateBoardRequest` (via `z.infer`)                       |
| Implementation         | `{Tech}*` prefix    | `DrizzleBoardRepository`, `EvlogLogger`, `UuidV7Generator` |
| Plugin factory         | `create*Module`     | `createBoardModule()`, `createTodoModule()`                |
| Controller factory     | `create*Controller` | `createBoardController()`                                  |

## Variable Naming

| Context              | Convention                                          | Example                                   |
| -------------------- | --------------------------------------------------- | ----------------------------------------- |
| Repository instances | `camelCase` matching entity                         | `boardRepo`, `memberRepo`, `snapshotRepo` |
| Use case instances   | `camelCase` matching class                          | `getBoard`, `createBoard`, `listMembers`  |
| DTO fields           | `camelCase`                                         | `boardId`, `userId`, `createdAt`          |
| DB columns           | `snake_case` (in Drizzle schema)                    | `board_id`, `owner_id`, `created_at`      |
| Zod schema variables | `camelCase` + `Schema`                              | `createBoardSchema`                       |
| Config objects       | `UPPER_SNAKE_CASE` for env, `camelCase` for options | `CORS_ORIGIN`, `CreateAppOptions`         |

## Directory Naming

All directories use **kebab-case**, **plural** for collections:

```
features/board/
├── domain/
│   ├── entities/          # Plural — contains multiple entity files
│   └── value-objects/     # Hyphenated, plural
├── application/
│   ├── ports/             # Plural
│   └── usecases/
│       ├── queries/       # Plural
│       └── commands/      # Plural
├── infrastructure/
│   ├── mappers/           # Plural
│   └── repositories/      # Plural
└── presentation/
    └── http/
        └── dtos/          # Plural
```

**Exception**: `collab/` sub-module uses singular (it's a single sub-feature, not a collection).

## Import Naming

```ts
import type { IBoardRepository } from "./ports/i-board.repository"; // type-only
import { BoardEntity } from "./entities/board.entity"; // value import
import type { Result } from "better-result"; // type-only
import { Result } from "better-result"; // when used as value
```

- `import type` for interfaces and type-only references
- `import` for classes, functions, and values used at runtime
- Never rename imports with aliases unless unavoidable

## Export Naming

- Named exports only — **no default exports**
- Barrel files (`index.ts`) re-export everything:

```ts
export { BoardEntity } from "./board.entity";
export { BoardMemberEntity } from "./board-member.entity";
```

- For branded types, export both the type and the factory object:

```ts
export type { BoardIdVO } from "./board-id.vo";
export { BoardIdVO } from "./board-id.vo";
```
