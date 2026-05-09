# Domain Layer Conventions

The domain layer is the innermost layer — it has **zero knowledge** of databases, HTTP, frameworks, or external services. It defines the business rules.

## Entity Pattern

### Structure

Every entity follows this exact pattern:

```ts
// features/board/domain/entities/board.entity.ts

import type { BoardIdVO } from "../value-objects/board-id.vo";
import type { BoardVisibilityVO } from "../value-objects/board-visibility.vo";
import { Result } from "better-result";

export class BoardEntity {
  // 1. Private constructor — forces use of factory methods
  private constructor(
    public readonly id: BoardIdVO,
    public title: string,
    public visibility: BoardVisibilityVO,
    public readonly ownerId: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  // 2. create() — validates inputs for NEW entities
  static create(
    id: BoardIdVO,
    title: string,
    visibility: BoardVisibilityVO,
    ownerId: string,
    now: Date,
  ): Result<BoardEntity, string> {
    if (!title || title.trim().length === 0) {
      return Result.err("Title is required");
    }
    if (!ownerId) {
      return Result.err("Owner ID is required");
    }
    return Result.ok(
      new BoardEntity(id, title.trim(), visibility, ownerId, now, now),
    );
  }

  // 3. restore() — trusts DB data, no validation
  static restore(
    id: BoardIdVO,
    title: string,
    visibility: BoardVisibilityVO,
    ownerId: string,
    createdAt: Date,
    updatedAt: Date,
  ): BoardEntity {
    return new BoardEntity(
      id,
      title,
      visibility,
      ownerId,
      createdAt,
      updatedAt,
    );
  }

  // 4. Query methods — return booleans/values, no side effects
  isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }

  // 5. Pure mutation methods — no auth checks, accept Date parameter
  updateTitle(title: string, now: Date): void {
    this.title = title;
    this.updatedAt = now;
  }

  changeVisibility(visibility: BoardVisibilityVO, now: Date): void {
    this.visibility = visibility;
    this.updatedAt = now;
  }
}
```

### Rules

| Rule                               | Why                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| **`private constructor`**          | Forces use of `create()` or `restore()` — entities are always in a valid state |
| **`static create()` validates**    | New entities must pass business rules (title non-empty, etc.)                  |
| **`static restore()` trusts**      | DB data is already validated; no re-validation on load                         |
| **`create()` returns `Result`**    | Validation failures are errors, not exceptions                                 |
| **`restore()` returns bare value** | DB data is trusted, no `Result` wrapper needed                                 |
| **Mutations are pure**             | No auth checks, no `new Date()` — accept `now: Date` parameter                 |
| **Auth is a use-case concern**     | Entities enforce structural invariants, not authorization                      |
| **`readonly` on immutable fields** | `id`, `ownerId`, `createdAt` can't change after creation                       |

### Immutable Entity Example

Some entities never change (e.g., snapshots). They only have `restore()`:

```ts
// features/board/domain/entities/board-snapshot.entity.ts
export class BoardSnapshotEntity {
  private constructor(
    public readonly id: number,
    public readonly boardId: BoardIdVO,
    public readonly data: Buffer,
    public readonly createdAt: Date,
  ) {}

  static restore(
    id: number,
    boardId: BoardIdVO,
    data: Buffer,
    createdAt: Date,
  ): BoardSnapshotEntity {
    return new BoardSnapshotEntity(id, boardId, data, createdAt);
  }
}
```

## Value Object Patterns

### Class-based VOs (enum-like with behavior)

Use when the VO has **behavior** (permissions, equality, serialization):

```ts
// features/board/domain/value-objects/member-role.vo.ts
export class MemberRoleVO {
  static readonly OWNER = new MemberRoleVO("owner");
  static readonly EDITOR = new MemberRoleVO("editor");
  static readonly VIEWER = new MemberRoleVO("viewer");

  private constructor(public readonly value: "owner" | "editor" | "viewer") {}

  get canEdit(): boolean {
    return this === MemberRoleVO.OWNER || this === MemberRoleVO.EDITOR;
  }

  get canManage(): boolean {
    return this === MemberRoleVO.OWNER;
  }

  equals(other: MemberRoleVO): boolean {
    return this.value === other.value;
  }

  static fromString(value: string): MemberRoleVO {
    switch (value) {
      case "owner":
        return MemberRoleVO.OWNER;
      case "editor":
        return MemberRoleVO.EDITOR;
      case "viewer":
        return MemberRoleVO.VIEWER;
      default:
        throw new Error(`Invalid MemberRole: ${value}`);
    }
  }

  toString(): string {
    return this.value;
  }
}
```

### Branded Type VOs (type-safe IDs)

Use for **type-safe identifiers** — prevents mixing `BoardIdVO` with `UserId`:

```ts
// features/board/domain/value-objects/board-id.vo.ts
import { type Brand, make } from "../../../../shared/kernel/types/brand";

export type BoardIdVO = Brand<string, "BoardId">;

export const BoardIdVO = {
  create: (id: string): BoardIdVO => make<BoardIdVO>(id),
};
```

The `Brand<T, B>` helper is defined in `shared/kernel/types/brand.ts`:

```ts
export type Brand<T, B> = T & { __brand: B };
export function make<T extends Brand<string, string>>(value: string): T {
  return value as T;
}
```

## Error Pattern

Use `TaggedError` from `better-result` for domain errors:

```ts
// features/board/domain/board.errors.ts
import { TaggedError } from "better-result";

export class BoardNotFoundError extends TaggedError("BoardNotFound")<{
  boardId: string;
}>() {}

export class BoardForbiddenError extends TaggedError("BoardForbidden")<{
  boardId: string;
  userId: string;
  action: string;
}>() {}

// Always export a union type for use in Result signatures
export type BoardError =
  | BoardNotFoundError
  | BoardAccessDeniedError
  | BoardForbiddenError
  | InviteExpiredError
  | InviteInvalidError
  | InviteAlreadyMemberError
  | MemberIsOwnerError
  | OwnerRequiredError;
```

### Rules

- One class per distinct error case
- Tag name matches class name without the "Error" suffix (`BoardNotFound`, not `BoardNotFoundError`)
- Payload is a typed object with relevant context (`boardId`, `userId`, `action`)
- Always export a `*Error` union type for `Result<T, BoardError>` signatures

## Barrel Exports

Every directory has an `index.ts` that re-exports:

```ts
// features/board/domain/entities/index.ts
export { BoardEntity } from "./board.entity";
export { BoardMemberEntity } from "./board-member.entity";
export { BoardInviteEntity } from "./board-invite.entity";
export { BoardSnapshotEntity } from "./board-snapshot.entity";
```

```ts
// features/board/domain/index.ts
export * from "./entities";
export * from "./value-objects";
export * from "./board.errors";
```
