# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌──────────────────┐  ┌───────────────────────────────┐    │
│  │ TanStack Router   │  │ Excalidraw Canvas             │    │
│  │ (file-based)      │  │ ┌───────────────────────────┐│    │
│  │                   │  │ │ LoroExcalidrawBinding    ││    │
│  │ /board            │  │ │ (Loro ↔ Excalidraw)      ││    │
│  │ /board/:id        │  │ └─────────┬─────────────────┘│    │
│  │ /board/invite/:t  │  │           │ LoroDoc            │    │
│  └───────┬───────────┘  └───────────┼──────────────────┘    │
│          │                         │                         │
│  ┌───────┴───────────┐  ┌──────────┴──────────┐             │
│  │ Eden Treaty       │  │ useCollab hook       │             │
│  │ (typed HTTP)      │  │ (WebSocket binary)   │             │
│  └───────┬───────────┘  └──────────┬──────────┘             │
└──────────┼─────────────────────────┼─────────────────────────┘
           │ HTTP (REST)             │ WebSocket (binary)
           │                         │
┌──────────┼─────────────────────────┼─────────────────────────┐
│          ▼                         ▼                         │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                    Elysia Server                      │    │
│  │                                                       │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │ authPlugin  │  │ boardRoutes  │  │  collabWs    │ │    │
│  │  │ (macro)     │  │ (REST API)   │  │  (Loro WS)   │ │    │
│  │  │             │  │              │  │              │ │    │
│  │  │ auth: true  │  │ GET/POST/    │  │ LoroSharedDoc  │ │    │
│  │  │ resolveSesn │  │ PATCH/DELETE │  │ room manager │ │    │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘ │    │
│  │         │                │                  │         │    │
│  │  ┌──────┴────────────────┴──────────────────┴───────┐ │    │
│  │  │              Domain Layer                        │ │    │
│  │  │                                                  │ │    │
│  │  │  BoardAccessService  ←──  Repositories           │ │    │
│  │  │  (Result<T,Error>)         (Drizzle queries)     │ │    │
│  │  │                                                  │ │    │
│  │  │  Entities ─── Value Objects ─── Errors           │ │    │
│  │  └──────────────────────┬───────────────────────────┘ │    │
│  └─────────────────────────┼─────────────────────────────┘
│                            │
│  ┌─────────────────────────┼─────────────────────────────┐
│  │              PostgreSQL                                │
│  │                                                        │
│  │  board ──< board_member                                │
│  │        ──< board_snapshot                              │
│  │        ──< board_invite                                │
│  └────────────────────────────────────────────────────────┘
│                                                             │
│  Bun Runtime                                                │
└─────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
vboard/
├── apps/
│   ├── server/                    # Elysia HTTP + WS server
│   │   └── src/index.ts           # Mounts all routes, exports type App
│   └── web/                       # TanStack Start (React SSR)
│       └── src/
│           ├── lib/
│           │   ├── collab.ts      # useCollab hook (Loro + WS)
│           │   └── eden.ts        # Eden Treaty client + EdenProvider
│           ├── components/
│           │   ├── excalidraw-wrapper.tsx  # Lazy-loaded canvas
│           │   └── header.tsx     # Nav with "Boards" link
│           └── routes/
│               ├── board.tsx      # Board list page
│               ├── board/
│               │   ├── $boardId.tsx       # Board editor page
│               │   └── invite/$token.tsx  # Invite claim page
│               └── ...
├── packages/
│   ├── api/                       # Domain + routes (Elysia plugins)
│   │   └── src/
│   │       ├── index.ts           # authPlugin (macro), re-exports
│   │       ├── domain/board/
│   │       │   ├── entities/      # Board, BoardMember, BoardSnapshot, BoardInvite
│   │       │   ├── value-objects/ # BoardId, MemberRole, BoardVisibility, InviteToken
│   │       │   ├── errors.ts      # TaggedError domain errors
│   │       │   ├── repositories/  # Drizzle-backed data access
│   │       │   ├── services/      # BoardAccessService
│   │       │   ├── routes.ts      # REST API (Elysia plugin)
│   │       │   └── collab.ts      # WebSocket handler (Loro sync)
│   │       └── routers/
│   │           └── todo.ts        # Legacy todo routes
│   ├── db/                        # Drizzle schema + client
│   │   └── src/schema/
│   │       ├── board.ts           # board, board_member, board_snapshot, board_invite
│   │       ├── auth.ts            # user, session (better-auth)
│   │       └── todo.ts            # todos (legacy)
│   ├── auth/                      # better-auth config
│   ├── env/                       # Zod env validation (server + web)
│   ├── ui/                        # Shared UI components (shadcn)
│   └── config/                    # Shared tsconfig, eslint
├── package.json                   # Workspace catalog (shared dep versions)
└── turbo.json                     # Turborepo pipeline
```

## Key Design Decisions

### 1. Auth via Elysia Macro (not plugin derive)

**Problem**: Elysia's `derive()`/`resolve()` don't propagate types across `.use()` plugin boundaries. Route handlers couldn't see `session` from `requireAuth`.

**Solution**: Custom `authPlugin` using `.macro()` with object shorthand:

- `{ auth: true }` — `beforeHandle` guards for 401, `resolve` adds typed `session` (non-null)
- `{ resolveSession: true }` — nullable `session` for optional-auth routes

```ts
// Route handlers get fully typed session — no `as any`
.get("/", ({ session }) => session.user.id, { auth: true })
.get("/:id", ({ session }) => session?.user?.id, { resolveSession: true })
```

### 2. Domain Layer with `Result<T, TaggedError>`

**Problem**: Throwing errors loses type information and control flow.

**Solution**: All domain operations return `Result<T, BoardError>` using `better-result`:

- `TaggedError` subclasses with structured data (e.g., `BoardNotFoundError { boardId }`)
- `Result.gen()` for async generator composition
- `Result.isError()` / `Result.unwrap()` for consumption
- Routes pattern-match on `error._tag` to map to HTTP status codes

```ts
const result = await boardAccessService.canEdit(boardId, userId);
if (Result.isError(result)) {
  if (result.error._tag === "BoardNotFound")
    return new Response(null, { status: 404 });
  if (result.error._tag === "BoardForbidden")
    return new Response(null, { status: 403 });
}
const { board, member } = Result.unwrap(result);
```

### 3. Loro WebSocket via Elysia `ws()`

**Problem**: We need a custom WebSocket handler for real-time CRDT sync.

**Solution**: Custom `LoroSharedDoc` class wrapping a `LoroDoc` with connection tracking and broadcasting:

- Room-per-board: `docs` Map holds `LoroSharedDoc` instances keyed by board ID
- Protocol: sync (msg type 0) + ephemeral (msg type 1) — custom binary protocol for Loro updates
- Auth on `open()`: validates session cookie, checks board access via `BoardAccessService`
- Read-only connections: sync messages dropped for viewers

### 4. Snapshot Persistence

**Strategy**: Encode full Loro state as binary (`doc.export({ mode: "snapshot" })`) stored in `bytea`:

- **On last disconnect**: When `LoroSharedDoc.conns.size === 0`, persist and destroy
- **Periodic (60s)**: For active boards, background `setInterval`
- **On open**: `LoroSharedDoc` constructor calls `loadSnapshot()` to hydrate from DB

### 5. Lazy-Loaded Excalidraw

Excalidraw is ~2MB. Loaded via React `lazy()` with `Suspense`:

```ts
const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((mod) => ({ default: mod.Excalidraw })),
);
```

No SSR — the canvas only renders client-side.

### 6. Branded Types for IDs

`BoardId` and `InviteToken` use opaque branded types to prevent accidental mixing:

```ts
type BoardId = string & { readonly __brand: "BoardId" };
const BoardId = (id: string) => id as BoardId;
```

## Real-Time Sync Protocol

```
Client A                Server                Client B
   │                      │                      │
   │── WS connect ───────►│◄──── WS connect ────│
   │                      │                      │
   │  auth (cookie)       │      auth (cookie)   │
   │  access check        │      access check    │
   │                      │                      │
   │◄─ initial snapshot ──│◄──── initial snapshot ──│
   │  (Loro full doc)     │      (Loro full doc) │
   │                      │                      │
   │── Loro update ──────►│── broadcast ────────►│
   │  (draw element)      │      (Loro delta)    │
   │                      │                      │
   │                      │                      │
   │  ... drawing ...     │      ... drawing ... │
   │                      │                      │
   │── disconnect ────────►│                      │
   │                      │                      │
   │                  last disconnect?            │
   │                  YES → persist snapshot      │
   │                  destroy doc                 │
```

## Error Handling Strategy

| Layer         | Strategy                           | Example                                                                  |
| ------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| **Domain**    | `Result<T, TaggedError>`           | `BoardAccessService.canEdit()` returns `Result<BoardAccess, BoardError>` |
| **Routes**    | Pattern match `_tag` → HTTP status | `BoardNotFound → 404`, `BoardForbidden → 403`                            |
| **WebSocket** | Close with status code             | `4403` for access denied                                                 |
| **Client**    | Eden Treaty error handling         | `result.error` in queries/mutations                                      |
| **UI**        | TanStack Query error + toast       | `onError` in QueryCache shows toast                                      |

## Performance Considerations

| Concern               | Approach                                                                    |
| --------------------- | --------------------------------------------------------------------------- |
| **Excalidraw bundle** | Lazy-loaded, no SSR                                                         |
| **Loro memory**        | Docs destroyed when last user disconnects                                   |
| **Snapshot size**     | Loro binary encoding is compact; full state typically <100KB                 |
| **DB queries**        | Indexed foreign keys; snapshot queries ordered by `created_at DESC LIMIT 1` |
| **WebSocket**         | Binary frames (ArrayBuffer), not JSON                                       |
| **API types**         | Eden Treaty — no codegen, derives from `typeof app`                         |

## Clean Architecture (Post-Refactor)

As of the Feature-First Clean Architecture refactor, `packages/api/src/` follows a 4-layer structure per feature:

```
packages/api/src/
├── bootstrap/           # createApp() — wires global plugins + feature modules
├── shared/
│   ├── kernel/          # Brand, Result, AppError
│   ├── application/     # ILogger, IIdGenerator, IDateProvider, IUnitOfWork
│   ├── infrastructure/  # DrizzleUnitOfWork, UuidV7Generator, EvlogLogger, RealDateProvider
│   └── presentation/    # authPlugin (macro), resultPlugin
└── features/
    ├── board/
    │   ├── domain/          # Entities (*Entity), VOs (*VO), errors
    │   ├── application/     # Ports (interfaces), DTOs, use cases (queries/ + commands/)
    │   ├── infrastructure/  # Drizzle repos, mappers (DB row → domain entity)
    │   ├── presentation/    # HTTP controller (Zod schemas), collab WS controller
    │   ├── collab/          # Sub-module: Loro doc registry, collab service, WS handler
    │   └── board.ioc.ts     # DI wiring (Elysia plugin factory)
    └── todo/
        ├── domain/          # TodoEntity
        ├── application/     # ITodoRepository, DTOs, queries, commands
        ├── infrastructure/  # Drizzle repo, mapper
        ├── presentation/    # HTTP controller (Zod schemas)
        └── todo.ioc.ts      # DI wiring
```

Key patterns:

- **CQRS-lite**: Use cases split into `queries/` (read) and `commands/` (write)
- **Unit of Work**: `IUnitOfWork` with `AsyncLocalStorage` for atomic multi-repo transactions
- **Factory methods**: Entities use `create()` (validates) and `restore()` (trusts DB)
- **Zod validation**: Transport DTOs validated with Zod schemas at presentation layer
- **Elysia plugin DI**: Each feature exposes a `createXxxModule()` plugin factory

See `clean-arch.md` for the full specification.
