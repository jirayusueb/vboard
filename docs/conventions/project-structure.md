# Project Structure

## Monorepo Layout

```
vboard/
├── apps/
│   ├── server/              # Elysia HTTP + WebSocket server (runtime entry point)
│   └── web/                 # TanStack Start (React SSR) frontend
├── packages/
│   ├── api/                 # Feature-First Clean Architecture (app definition)
│   ├── auth/                # better-auth integration
│   ├── db/                  # Drizzle ORM, schema definitions, DB client
│   ├── env/                 # Environment variable validation (shared)
│   ├── ui/                  # Shared React component library
│   └── config/              # Shared TypeScript config
├── docs/
│   ├── prd/                 # Product requirements, architecture, API reference
│   └── conventions/         # This directory — coding conventions
├── turbo.json               # Turborepo task pipeline
└── package.json             # Workspace root with catalog deps
```

## Package Responsibilities

| Package           | Responsibility                                        | Key Exports                                  |
| ----------------- | ----------------------------------------------------- | -------------------------------------------- |
| `packages/api`    | Feature modules, domain logic, use cases, controllers | `createApp()` via `@vboard/api/bootstrap`    |
| `packages/db`     | Drizzle ORM schema, DB client (`db`), migrations      | `db`, schema objects (`board`, `todo`, etc.) |
| `packages/auth`   | better-auth instance and configuration                | `auth` (better-auth instance)                |
| `packages/env`    | Zod-validated environment variables                   | `env` (server/client split)                  |
| `packages/ui`     | Shared React components                               | Component library                            |
| `packages/config` | Shared TypeScript configs                             | `tsconfig.base.json`                         |

## Dependency Graph

```
apps/server → packages/api → packages/db
                            → packages/auth
                            → packages/env

apps/web    → packages/api (via Eden Treaty types only)
            → packages/ui
            → packages/auth
            → packages/env
```

**Rule**: `packages/api` imports from `packages/db`, `packages/auth`, and `packages/env`. It never imports from `packages/ui` or `apps/*`.

## `packages/api/src/` Structure

```
packages/api/src/
├── bootstrap/
│   ├── app.ts              # createApp() — wires global plugins + feature modules
│   └── index.ts            # Re-exports createApp
│
├── shared/
│   ├── kernel/
│   │   ├── types/          # Brand helper, Result re-exports
│   │   └── errors/         # AppError base class
│   ├── application/
│   │   └── interfaces/     # ILogger, IIdGenerator, IDateProvider, IUnitOfWork
│   ├── infrastructure/
│   │   ├── database/       # db re-export, transaction context, DrizzleUnitOfWork
│   │   ├── ids/            # UuidV7Generator
│   │   ├── logging/        # EvlogLogger
│   │   └── date/           # RealDateProvider
│   └── presentation/
│       └── plugins/        # authPlugin (macro), resultPlugin
│
└── features/
    ├── board/
    │   ├── domain/         # Entities, VOs, errors
    │   ├── application/    # Ports, DTOs, use cases (queries/ + commands/)
    │   ├── infrastructure/ # Repos, mappers, schema re-exports
    │   ├── presentation/   # HTTP controller, Zod schemas, error mapper
    │   ├── collab/         # Self-contained sub-module (4-layer, own IOC)
    │   │   ├── domain/     # AccessLevel VO, CollabErrors
    │   │   ├── application/ # 5 ports, ConnectCollabCommand use case
    │   │   ├── infrastructure/ # YjsDocRegistry, BoardAccessChecker adapters
    │   │   ├── presentation/ # WS controller
    │   │   └── collab.ioc.ts # Own DI wiring
    │   └── board.ioc.ts    # Board DI wiring (uses createCollabModule)
    └── todo/
        ├── domain/
        ├── application/
        ├── infrastructure/
        ├── presentation/
        └── todo.ioc.ts
```

### The 3-Directory Split

| Directory    | Purpose                                     | Depends on             |
| ------------ | ------------------------------------------- | ---------------------- |
| `bootstrap/` | App factory, wires everything together      | `features/`, `shared/` |
| `shared/`    | Cross-cutting interfaces and infrastructure | External packages only |
| `features/`  | Business features with 4-layer architecture | `shared/`              |

## Server Entry Point

`apps/server` is the runtime entry. It adds cross-cutting concerns (CORS, evlog logging) and mounts the API app:

```ts
// apps/server/src/index.ts
import { createApp } from "@vboard/api/bootstrap";
import { cors } from "@elysiajs/cors";
import { evlog } from "evlog/elysia";

const apiApp = createApp();

const app = new Elysia()
  .use(evlog())
  .use(cors({ origin: env.CORS_ORIGIN, ... }))
  .use(apiApp)
  .listen(3000);

export type App = typeof app;
```

**Key insight**: `packages/api` defines the app. `apps/server` runs it. CORS and logging live in the server, not the API package.

## Turbo Task Pipeline

```jsonc
// turbo.json
{
  "build": { "dependsOn": ["^build"] }, // Build deps first
  "check-types": { "dependsOn": ["^check-types"] }, // Type-check deps first
  "test": { "dependsOn": ["^build"] }, // Build before testing
  "dev": { "cache": false, "persistent": true }, // Never cache dev
}
```

Common commands:

- `bun run check-types` — TypeScript type checking across all packages
- `bun run test` — Run all tests via Vitest
- `bun run dev:server` — Start dev server with hot reload
- `bun run dev:web` — Start frontend dev server

## Package Exports

Each package uses `package.json` `exports` for workspace imports:

```jsonc
// packages/api/package.json
{
  "exports": {
    ".": { "default": "./src/bootstrap/index.ts" },
    "./bootstrap": { "default": "./src/bootstrap/index.ts" },
    "./*": { "default": "./src/*.ts" },
  },
}
```

This enables:

- `import { createApp } from "@vboard/api/bootstrap"`
- `import { db } from "@vboard/db"`
- `import { auth } from "@vboard/auth"`
