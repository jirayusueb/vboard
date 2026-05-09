# Style Guide

## Import Order

Imports are organized in groups, separated by blank lines:

```ts
// 1. External packages
import Elysia from "elysia";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { Result } from "better-result";

// 2. Workspace packages
import { db } from "@vboard/db";
import { auth } from "@vboard/auth";
import { board } from "@vboard/db/schema/board";

// 3. Shared kernel / infrastructure (absolute-ish paths)
import { BoardIdVO } from "../../domain/value-objects/board-id.vo";
import { DrizzleBoardRepository } from "./infrastructure/repositories/drizzle-board.repository";

// 4. Relative imports (same feature)
import type { IBoardRepository } from "../../application/ports/i-board.repository";
import type { BoardEntity } from "../../domain/entities/board.entity";
import { toBoardDomain } from "../mappers/board.mapper";
```

The formatter (ultracite/biome) auto-sorts imports. Don't fight it.

## Type Imports

Use `import type` for interfaces and type-only references:

```ts
// ✅ Correct — type-only
import type { IBoardRepository } from "./ports/i-board.repository";
import type { Result } from "better-result";
import type { BoardError } from "./board.errors";

// ✅ Correct — value import (used at runtime)
import { BoardEntity } from "./entities/board.entity";
import { Result } from "better-result"; // When used as a value (Result.ok, Result.err)
```

**Rule of thumb**: If you only use it in a type position (parameter type, return type, generic), use `import type`. If you call methods on it or construct it, use `import`.

## Comments & JSDoc

All exported functions, classes, and interfaces must have JSDoc:

```ts
/**
 * BoardEntity — aggregate root for the Board feature.
 * Factory methods: create() validates new boards, restore() trusts DB data.
 * Mutations are pure (no auth checks — authorization is a use-case concern).
 */
export class BoardEntity {
  /**
   * Create a new board — validates inputs.
   */
  static create(...): Result<BoardEntity, string> { ... }

  /**
   * Restore from persistence — trusts DB data, no validation.
   */
  static restore(...): BoardEntity { ... }

  /** Query — use cases check this to enforce authorization */
  isOwnedBy(userId: string): boolean { ... }

  /** Pure mutation — no auth check, use case enforces ownership */
  updateTitle(title: string, now: Date): void { ... }
}
```

### Comment Style

- **JSDoc** (`/** */`) for all exported symbols
- **Inline** (`//`) for "why" comments, not "what" comments
- **Section comments** (`// ── Section Name ──`) for grouping in long files
- No `/* */` block comments except for JSDoc

## TypeScript Configuration

```jsonc
// packages/api/tsconfig.json
{
  "extends": "@vboard/config/tsconfig.base.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "composite": true,
    "strictNullChecks": true,
  },
}
```

### Key Rules

| Setting            | Value                                                          | Why                                                           |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------- |
| `strictNullChecks` | `true`                                                         | Catch null/undefined errors at compile time                   |
| `composite`        | `true`                                                         | Required for project references (monorepo)                    |
| No `any`           | Only for Elysia `mapResponse` generic + Yjs awareness callback | `any` only where external library types are genuinely untyped |
| Named exports only | No default exports                                             | Consistent import style, better tree-shaking                  |

## Export Style

```ts
// ✅ Named exports
export class BoardEntity { ... }
export function toBoardDomain(row: BoardRow): BoardEntity { ... }
export type BoardError = BoardNotFoundError | BoardForbiddenError;

// ❌ No default exports
export default class BoardEntity { ... }  // NEVER
```

## Barrel Files

Every directory has an `index.ts` that re-exports:

```ts
// Simple re-exports
export { BoardEntity } from "./board.entity";
export { BoardMemberEntity } from "./board-member.entity";

// Type + value exports for branded types
export type { BoardIdVO } from "./board-id.vo";
export { BoardIdVO } from "./board-id.vo";

// Re-export all from subdirectory
export * from "./entities";
export * from "./value-objects";
```

## Formatting

Formatter: **ultracite** (biome + oxfmt)

```bash
# Check formatting
bun run check

# Auto-fix
bun run fix
```

### Key Formatting Rules

- **Indentation**: Tabs (not spaces)
- **Semicolons**: No semicolons (ASI)
- **Trailing commas**: Yes
- **Line width**: 80 characters (enforced by formatter)
- **Quote style**: Double quotes

## Error Handling

```ts
// ✅ Return Result — never throw in use cases
async execute(input): Promise<Result<Output, Error>> {
  const board = await this.boardRepo.findById(id);
  if (!board) {
    return Result.err(new BoardNotFoundError({ boardId: input.boardId }));
  }
  return Result.ok(output);
}

// ✅ Use typed error mapper in controllers
if (result.isErr()) {
  const { status, body } = mapBoardError(result.error);
  return new Response(body, { status });
}
return result.unwrap();
```

## Naming Conventions Summary

Quick reference (see [Naming](./naming.md) for full details):

| What        | Convention                  | Example                                 |
| ----------- | --------------------------- | --------------------------------------- |
| Files       | kebab-case with type suffix | `board.entity.ts`                       |
| Classes     | PascalCase with suffix      | `BoardEntity`, `DrizzleBoardRepository` |
| Interfaces  | `I` prefix                  | `IBoardRepository`, `ILogger`           |
| Types       | PascalCase                  | `BoardError`, `CreateBoardInput`        |
| Functions   | camelCase                   | `toBoardDomain()`, `createApp()`        |
| Variables   | camelCase                   | `boardRepo`, `dateProvider`             |
| Constants   | PascalCase (VO statics)     | `BoardVisibilityVO.PUBLIC`              |
| Zod schemas | camelCase + Schema          | `createBoardSchema`                     |
