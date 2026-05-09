# Plan: AccessLevel → Class-Based AccessLevelVO

## Current State

`AccessLevel` is a string union type + plain object with static helpers:

- `type AccessLevel = "READ_ONLY" | "EDITOR"`
- Object with `READ_ONLY`, `EDITOR` constants, `fromBoolean()`, `isEditor()`
- Used as a bare string throughout (passed in DTOs, returned from ports)

## Target State

`AccessLevelVO` becomes an opaque class instance (like `IdVO`). Consumers use methods on the instance rather than bare strings.

## Design

```ts
// collab/domain/value-objects/access-level.vo.ts
export type AccessLevelTag = "READ_ONLY" | "EDITOR";

export class AccessLevelVO {
  static readonly READ_ONLY = new AccessLevelVO("READ_ONLY");
  static readonly EDITOR = new AccessLevelVO("EDITOR");

  private constructor(private readonly _tag: AccessLevelTag) {}

  static fromBoolean(canEdit: boolean): AccessLevelVO { ... }
  isEditor(): boolean { ... }
  get value(): AccessLevelTag { ... }
  equals(other: AccessLevelVO): boolean { ... }
}
```

## Files to Change (8 files)

### 1. `collab/domain/value-objects/access-level.vo.ts` — Rewrite

- Replace type + object with `AccessLevelVO` class
- Export `type AccessLevelVO` (class is both type and value)
- Add `value` getter, `equals()`, `isEditor()` instance method

### 2. `collab/domain/value-objects/access-level.vo.test.ts` — Update tests

- `AccessLevel.READ_ONLY` → `AccessLevelVO.READ_ONLY`
- `AccessLevel.fromBoolean(true)` → `AccessLevelVO.fromBoolean(true)` (still static)
- `AccessLevel.isEditor("EDITOR")` → `AccessLevelVO.EDITOR.isEditor()`
- Add test for `value` getter, `equals()`

### 3. `collab/domain/value-objects/index.ts` — Update barrel

- `export type { AccessLevel }` → `export { type AccessLevelVO } from "./access-level.vo"`
- Remove `AccessLevelFactory` alias

### 4. `collab/application/collab.dtos.ts` — Update type ref

- `import type { AccessLevel }` → `import type { AccessLevelVO }`
- `accessLevel: AccessLevel` → `accessLevel: AccessLevelVO`

### 5. `collab/application/ports/i-collab-service.port.ts` — Update type ref

- `import type { AccessLevel }` → `import type { AccessLevelVO }`
- `AccessLevel | null` → `AccessLevelVO | null`

### 6. `collab/application/ports/i-board-access-checker.port.ts` — Update type ref

- `import type { AccessLevel }` → `import type { AccessLevelVO }`
- `Result<AccessLevel, CollabError>` → `Result<AccessLevelVO, CollabError>`

### 7. `collab/infrastructure/board-access-checker.ts` — Update impl

- Remove `AccessLevelFactory` import, import `AccessLevelVO`
- `AccessLevelFactory.READ_ONLY` → `AccessLevelVO.READ_ONLY`
- `AccessLevelFactory.fromBoolean(...)` → `AccessLevelVO.fromBoolean(...)`

### 8. `collab/infrastructure/collab.service.ts` — Update impl

- Remove `AccessLevelVO` alias import, import directly
- `AccessLevelVO.isEditor(accessLevel)` → `accessLevel.isEditor()`
- Return type `AccessLevel | null` → `AccessLevelVO | null`

## Not Changing

- `collab/domain/index.ts` — no AccessLevel re-export currently
- No files outside `collab/` reference AccessLevel

## Verification

- `npx tsc --noEmit` — zero new errors
- `bun test` — AccessLevel tests pass
- Dev server starts
