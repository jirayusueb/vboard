# Plan: Remove Deprecated Code & Clean Up

## Context

The Yjs → Loro migration is complete, but stale references and artifacts remain. Additionally, the project was scaffolded with `create-better-t-stack` using a `--examples todo` flag, and the docs/plans directories contain completed/outdated plan files. This plan sweeps all of that out.

## What to Clean Up

### 1. Stale Yjs Comments (2 files in `packages/api`)

| File | Line(s) | What |
|---|---|---|
| `packages/api/src/features/board/domain/entities/board-snapshot.entity.ts` | 2 | Comment says "a persisted **Yjs** document state" — should say Loro/CRDT |
| `packages/api/src/features/board/collab/application/ports/ws-context.port.ts` | 22 | JSDoc says "Cast … for **Yjs** registry interop" — should say Loro |

### 2. Stale `TodoId` Example in Brand.ts

| File | Line(s) | What |
|---|---|---|
| `packages/api/src/shared/kernel/types/brand.ts` | 30-35 | `@example` block uses `TodoId` / `TodoIdVO` — a scaffolded example that never existed in the board feature. Replace with `BoardId` / `BoardIdVO` to match the actual codebase. |

### 3. Completed Plan Files (4 files in `plans/`)

| File | Reason |
|---|---|
| `plans/yjs-to-loro-migration.md` | Migration complete — all steps checked ✅ |
| `plans/fix-web-lint-typecheck-build.md` | Already executed (restructure + lint fixes done) |
| `plans/e2e-pom-extraction.md` | Already executed (e2e POM is in place) |
| `plans/e2e-test-cases.md` | Test cases designed, reference doc — keep or archive? |

### 4. Root `PLAN.md`

| File | Reason |
|---|---|
| `PLAN.md` | Describes a snapshot race-condition fix that appears already resolved. If so, delete. |

### 5. Build/Test Artifacts Not in `.gitignore`

| Path | What |
|---|---|
| `apps/web/playwright-report/` | 533 KB HTML report — should be gitignored |
| `apps/e2e/playwright-report/` | 533 KB HTML report — should be gitignored |
| `apps/e2e/test-results/` | Test run metadata — should be gitignored |

`.gitignore` is missing entries for `playwright-report/` and `test-results/`.

### 6. Stale Scaffold File: `bts.jsonc`

| File | Reason |
|---|---|
| `bts.jsonc` | Better-T-Stack scaffold metadata. File header literally says "This file is safe to delete." |

## Approach

Minimal, safe deletions and comment fixes. No code logic changes, no dependency removals.

## Files to Modify

| File | Action |
|---|---|
| `packages/api/src/features/board/domain/entities/board-snapshot.entity.ts` | Edit comment: "Yjs" → "Loro" |
| `packages/api/src/features/board/collab/application/ports/ws-context.port.ts` | Edit comment: "Yjs" → "Loro" |
| `packages/api/src/shared/kernel/types/brand.ts` | Replace `TodoId` example with `BoardId` |
| `.gitignore` | Add `playwright-report/` and `test-results/` entries |
| `.gitignore` | Add `bts.jsonc` if we delete it (so it doesn't come back from scaffold) |

## Files to Delete

| File | Reason |
|---|---|
| `plans/yjs-to-loro-migration.md` | Completed plan |
| `plans/fix-web-lint-typecheck-build.md` | Completed plan |
| `plans/e2e-pom-extraction.md` | Completed plan |
| `PLAN.md` | Completed fix |
| `bts.jsonc` | Scaffold metadata, safe to delete per its own header |

**Keep:** `plans/e2e-test-cases.md` (living reference for test coverage tracking)

## Steps

- [ ] 1. Fix stale Yjs comment in `board-snapshot.entity.ts`
- [ ] 2. Fix stale Yjs comment in `ws-context.port.ts`
- [ ] 3. Replace `TodoId` example with `BoardId` in `brand.ts`
- [ ] 4. Add `playwright-report/` and `test-results/` to `.gitignore`
- [ ] 5. Delete `plans/yjs-to-loro-migration.md`
- [ ] 6. Delete `plans/fix-web-lint-typecheck-build.md`
- [ ] 7. Delete `plans/e2e-pom-extraction.md`
- [ ] 8. Delete `PLAN.md`
- [ ] 9. Delete `bts.jsonc`
- [ ] 10. Verify: `grep -ri yjs packages/ apps/ --include='*.ts' --include='*.tsx'` returns zero hits
- [ ] 11. Verify: `turbo check-types` passes
- [ ] 12. Verify: `turbo test` passes

## Verification

```bash
# No Yjs references remain in source
grep -ri yjs packages/ apps/ --include='*.ts' --include='*.tsx'
# → zero hits

# Types and tests still pass
turbo check-types
turbo test
```
