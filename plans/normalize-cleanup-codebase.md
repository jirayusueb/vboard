# Normalize & Cleanup Codebase

## Context

The codebase has undergone significant changes — Yjs→Loro migration, web app restructure (flat `components/` + `lib/` → feature-first `features/` + `shared/`), and e2e test extraction. However, the working tree has ~67 files changed (800 insertions, ~1934 deletions) and 48 untracked files still uncommitted. There's an existing `plans/cleanup-remove-deprecated.md` that covers some items, but it was never executed and is now partially stale.

This plan normalizes the codebase into a clean state: fix the typecheck errors, resolve the lint issue, clean up artifacts, remove stale references, and commit all the uncommitted work properly.

## Approach

1. **First**: Commit the existing uncommitted restructure (web app file moves, e2e additions, etc.) to get a clean baseline
2. **Then**: Fix remaining issues (typecheck errors, lint, stale refs, deps)
3. **Finally**: Verify everything is green (lint + typecheck + tests)

---

## Step 1 — Commit existing uncommitted work

The working tree has a web app restructure (file moves + edits) and new e2e tests. These should be committed as-is (they're structural changes, not bugs).

- [ ] Stage all untracked files (e2e app, .env.example, Dockerfile)
- [ ] Stage all modified/deleted files
- [ ] Commit with descriptive message covering the restructure + e2e additions

## Step 2 — Fix typecheck errors (41 errors)

**Root cause**: Duplicate `drizzle-orm` in root `package.json` creates two separate module resolutions (`+4c57a585410082ab` vs `+2684a65f9ddcb94f`), causing `SQL<unknown>` type mismatch in repository files.

**Files affected**:
- `packages/api/src/features/board/infrastructure/repositories/drizzle-board.repository.ts`
- `packages/api/src/features/board/infrastructure/repositories/drizzle-board-invite.repository.ts`
- `packages/api/src/features/board/infrastructure/repositories/drizzle-board-member.repository.ts`
- `packages/api/src/features/board/infrastructure/repositories/drizzle-board-snapshot.repository.ts`
- `package.json` (has stray `"drizzle-orm"` in dependencies — should be removed)

**Fix**:
- [ ] Remove `"drizzle-orm": "^0.45.1"` from root `package.json` dependencies (it's a catalog dep used by `packages/db` and `packages/api`, not the root)
- [ ] Remove `"@types/pg": "^8.16.0"` from root `package.json` (belongs in `packages/db`)
- [ ] Run `bun install` to deduplicate lockfile entries
- [ ] Verify `bun run check-types` passes

## Step 3 — Fix lint formatting issue

**File**: `apps/web/src/router.tsx` — property ordering in `createTanStackRouter()` call.

- [ ] Apply the oxfmt suggestion (alphabetize properties)

## Step 4 — Remove stale Yjs comments

From the old migration — 2 files still reference "Yjs" in comments:

- [ ] `packages/api/src/features/board/domain/entities/board-snapshot.entity.ts` line 2: "Yjs" → "Loro/CRDT"
- [ ] `packages/api/src/features/board/collab/application/ports/ws-context.port.ts` line 22: "Yjs" → "Loro"

## Step 5 — Clean up PLAN.md

- [ ] Delete root `PLAN.md` (production readiness plan — superseded / outdated)

## Step 6 — Delete completed plan files

- [ ] Delete `plans/yjs-to-loro-migration.md` (migration complete)
- [ ] Delete `plans/fix-web-lint-typecheck-build.md` (already executed)
- [ ] Delete `plans/e2e-pom-extraction.md` (already executed)
- [ ] Delete `plans/cleanup-remove-deprecated.md` (replaced by this plan)
- [ ] Keep `plans/e2e-test-cases.md` (living reference)
- [ ] Keep `plans/loro-optimization-research.md` (research reference)

## Step 7 — Verify React version alignment

`packages/ui` has `react: ^19.2.3` while `apps/web` has `react: ^19.2.5`. Both are `^19` so they resolve to the same version via lockfile — no action needed, but worth noting for consistency:

- [ ] Bump `packages/ui` react to match `apps/web` or use catalog (low priority)

## Step 8 — Verify `console.log` in `packages/db`

`packages/db/src/index.ts` uses raw `console.log` for query logging. The rest of the server uses `evlog`. This is acceptable for a low-level DB wrapper — no change needed.

---

## Files to Modify

| File | Action |
|---|---|
| `package.json` | Remove stray `drizzle-orm` and `@types/pg` from dependencies |
| `apps/web/src/router.tsx` | Apply lint fix (property ordering) |
| `packages/api/.../board-snapshot.entity.ts` | Fix stale "Yjs" comment |
| `packages/api/.../ws-context.port.ts` | Fix stale "Yjs" comment |

## Files to Delete

| File | Reason |
|---|---|
| `PLAN.md` | Outdated production readiness plan |
| `plans/cleanup-remove-deprecated.md` | Replaced by this plan |
| `plans/yjs-to-loro-migration.md` | Completed |
| `plans/fix-web-lint-typecheck-build.md` | Completed |
| `plans/e2e-pom-extraction.md` | Completed |

## Verification

```bash
# 1. Lint passes
bun run check

# 2. Typecheck passes (0 errors)
bun run check-types

# 3. All tests pass
bun run test

# 4. Working tree clean
git status --short  # should be empty (or only newly changed files from this plan)

# 5. No stale references
grep -rn 'Yjs\|yjs' packages/api/src/ apps/web/src/ apps/server/src/
# Should return zero results
```
