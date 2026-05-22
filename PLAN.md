# Production Readiness Plan

## Context

VBoard is a collaborative whiteboard app (Yjs→Loro migration complete) with:
- **Server**: Elysia + Bun, clean-arch API (`packages/api`), Drizzle ORM, PostgreSQL 18
- **Web**: TanStack Start (SSR), React 19, Excalidraw, Loro CRDT via WASM
- **Infra**: Turborepo monorepo, no CI/CD, no Dockerfile, no deployment config

The codebase has solid architecture (clean architecture, DI, ports/adapters) but lacks production hardening. This plan addresses the critical gaps to make it deployable and resilient.

---

## Approach

Tackle production readiness in priority order: security & secrets → error handling & observability → infrastructure & deployment → performance & resilience → developer experience.

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/env/src/server.ts` | Add `PORT` env var, tighten validation |
| `packages/env/src/web.ts` | Add `VITE_WS_URL` for explicit WS endpoint |
| `apps/server/src/index.ts` | Graceful shutdown, remove duplicate CORS, configurable port |
| `packages/api/src/bootstrap/app.ts` | Remove duplicate CORS (already in server) |
| `packages/api/src/shared/presentation/plugins/auth.plugin.ts` | Add session expiry check, rate limiting |
| `packages/api/src/features/board/presentation/http/error-mapper.ts` | Add generic 500 fallback for unhandled errors |
| `packages/api/src/features/board/collab/infrastructure/loro-doc-registry.ts` | Graceful shutdown (persist all docs), uncaught error handling |
| `packages/db/src/index.ts` | Connection pooling config, pool metrics |
| `packages/auth/src/index.ts` | Session length limits, password strength |
| `apps/web/src/features/board/collab.ts` | Fix `connectionState` in useEffect deps (causes infinite loops) |
| `apps/web/src/routes/__root.tsx` | Remove devtools in production builds |
| `apps/web/src/router.tsx` | Add proper error boundary component |
| `apps/web/src/features/board/excalidraw-wrapper.tsx` | Remove `__excalidrawAPI` global in production |
| `docker-compose.yml` | Add production profile with health checks |
| `Dockerfile` | **New** — multi-stage build for server |
| `.env.example` | **New** — documented env template |
| `apps/web/.env.example` | **New** — client env template |
| `packages/api/src/shared/infrastructure/database/index.ts` | Add connection pool config export |

---

## Reuse

- `evlog` — already integrated for structured logging; extend to all error paths
- `better-result` — `Result`/`TaggedError` pattern used throughout domain; ensure all controllers use `mapBoardError`
- `@vboard/env` — central env validation; add new vars here
- `AppError` class — existing in shared kernel for cross-feature errors
- `DrizzleUnitOfWork` — existing transaction pattern; keep using it for all writes

---

## Steps

### Phase 1: Security & Configuration

- [x] **1.1** Create `.env.example` files with documented required/optional vars for both server and web
- [x] **1.2** Add `PORT` env var to `packages/env/src/server.ts` (default 3000), remove hardcoded port in `apps/server/src/index.ts`
- [x] **1.3** Remove duplicate CORS middleware — `bootstrap/app.ts` adds its own CORS; server already has CORS. Keep only in `server/src/index.ts`
- [x] **1.4** Add `VITE_WS_URL` to `packages/env/src/web.ts` so WebSocket URL is configurable (not derived from `window.location`) for deployments behind reverse proxies
- [x] **1.5** Add session configuration to `packages/auth/src/index.ts`: set max session age (e.g. 7 days), password min length (8 chars), rate limit login attempts
- [x] **1.6** Add `SANDBOX` CSP-like headers via Elysia `onRequest` for production (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` when HTTPS)

### Phase 2: Error Handling & Observability

- [x] **2.1** Add global error handler in `apps/server/src/index.ts` via Elysia `onError` hook — catch unhandled errors, return structured JSON `{ error: string }` with 500 status, log via evlog
- [x] **2.2** Add `onError` to the board controller for validation errors (Zod parse failures) — return 400 with field-level messages
- [x] **2.3** Add health check endpoint `/api/health` with DB connectivity test (currently returns plain `"OK"` string, not JSON, and doesn't check DB)
- [x] **2.4** Add WebSocket error handling in `collab-ws.controller.ts` — wrap `open` in try/catch, log unhandled errors instead of silently failing
- [x] **2.5** Ensure `loro-doc-registry.ts` `handleMessage` catches and logs all errors (currently has some bare `catch {}` blocks)
- [x] **2.6** Add proper `404` and `500` page components in the web app (`routes/__root.tsx` / `router.tsx` `defaultErrorComponent`)

### Phase 3: Graceful Shutdown & Resilience

- [x] **3.1** Add graceful shutdown to `apps/server/src/index.ts` — on `SIGTERM`/`SIGINT`: stop accepting new connections, persist all in-memory Loro docs to DB, close DB pool, then exit
- [x] **3.2** Add `dispose()` method to `LoroDocRegistry` that persists all docs and clears eviction timers — called during graceful shutdown
- [x] **3.3** Add DB connection pool configuration to `packages/db/src/index.ts` — set `max` connections, `idle_timeout`, `connect_timeout` via env vars
- [x] **3.4** Fix `useCollab` hook in `apps/web/src/features/board/collab.ts` — `connectionState` is in the useEffect dependency array, which causes infinite re-renders (state change → effect re-runs → state change). Remove it from deps or restructure to use refs
- [x] **3.5** Add DB reconnection handling — Drizzle/node-postgres auto-reconnects, but add explicit error logging on connection loss

### Phase 4: Infrastructure & Deployment

- [x] **4.1** Create `Dockerfile` — multi-stage: `bun install` → `turbo build` → runtime stage with minimal image (`oven/bun:alpine`)
- [x] **4.2** Update `docker-compose.yml` — add `server` service, health check (`/api/health`), resource limits, production profile
- [x] **4.3** Add `build` and `start` scripts to root `package.json` for production: `"start:server": "turbo -F server start"`
- [x] **4.5** Strip dev-only code in production builds — remove `__excalidrawAPI` global leak, remove TanStack/ReactQuery devtools in prod (guard with `import.meta.env.DEV`)

### Phase 5: Performance & Monitoring

- [x] **5.1** Add request duration logging to server via evlog middleware (already partially done with evlog plugin, verify it logs latency)
- [x] **5.2** Add DB query performance logging — Drizzle `logger: true` in development, structured query timing in production
- [x] **5.3** Add snapshot cleanup job — old snapshots accumulate in `board_snapshot` table. Add a periodic cleanup that keeps only the latest N snapshots per board (e.g., latest 5)
- [x] **5.4** Add memory usage monitoring to `LoroDocRegistry` — log total in-memory doc count and estimated size periodically
- [x] **5.5** Add invite expiry enforcement — `board_invite.expiresAt` exists in schema but no cleanup job prunes expired invites

---

## Verification

1. **Security**: Run `bun run check-types` — all env vars compile. Verify `.env.example` matches actual schema.
2. **Error handling**: Send malformed JSON to POST `/api/board` → expect 400 with field errors. Hit undefined route → expect 404 JSON.
3. **Graceful shutdown**: `docker-compose up`, send `SIGTERM` to server, verify logs show "persisting N docs" and clean exit.
4. **Health check**: `curl /api/health` → `{"status":"ok","db":true}`. Stop Postgres → `{"status":"degraded","db":false}`.
5. **No infinite loops**: Open board page in browser, verify `useCollab` doesn't create repeated WS connections in DevTools Network tab.
6. **Devtools stripped**: Build web app (`turbo -F web build`), verify no devtools imports in production bundle.
7. **E2E**: Run existing Playwright suite (`apps/e2e`) — all tests pass.
