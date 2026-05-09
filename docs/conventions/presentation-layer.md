# Presentation Layer Conventions

The presentation layer handles HTTP and WebSocket transport. Controllers are **thin** — they validate input, call use cases, and map results to HTTP responses. Zero business logic.

## Controller Pattern

Controllers are **factory functions** that return an Elysia instance:

```ts
// features/board/presentation/http/board.controller.ts

import Elysia from "elysia";
import { authPlugin } from "../../../../shared/presentation/plugins/auth.plugin";
import type { GetBoardQuery } from "../../application/usecases/queries";
import type { CreateBoardCommand } from "../../application/usecases/commands";
import { createBoardSchema, updateBoardSchema } from "./dtos/board-request.dto";
import { mapBoardError } from "./error-mapper";

export function createBoardController(deps: {
  getBoard: GetBoardQuery;
  createBoard: CreateBoardCommand;
  // ... other use cases
}) {
  return (
    new Elysia({ prefix: "/board" })
      .use(authPlugin)

      // Public route (optional auth)
      .get(
        "/:id",
        async ({ params, session }) => {
          const result = await deps.getBoard.execute({
            boardId: params.id,
            userId: session?.user?.id,
          });
          if (result.isErr()) {
            const { status, body } = mapBoardError(result.error);
            return new Response(body, { status });
          }
          return result.unwrap();
        },
        { resolveSession: true },
      )

      // Protected route (required auth)
      .post(
        "/",
        async ({ body, session }) => {
          const result = await deps.createBoard.execute({
            title: body.title,
            visibility: body.visibility,
            userId: session.user.id,
          });
          if (result.isErr()) {
            const { status, body: errBody } = mapBoardError(result.error);
            return new Response(errBody, { status });
          }
          return result.unwrap();
        },
        { auth: true, body: createBoardSchema },
      )
  );
}
```

### Controller Rules

| Rule                             | Why                                                             |
| -------------------------------- | --------------------------------------------------------------- |
| **Factory function**, not class  | Enables dependency injection via `deps` object                  |
| **Use `authPlugin` macro**       | Type-safe auth at the route level                               |
| **Validate with Zod schemas**    | Elysia validates `body`/`params` before handler runs            |
| **Call use case, handle Result** | `result.isErr()` → map to HTTP status                           |
| **No business logic**            | Controllers only: parse input → call use case → format response |
| **`{ resolveSession: true }`**   | For routes that work for both logged-in and anonymous users     |
| **`{ auth: true }`**             | For routes that require authentication (returns 401 if missing) |

## Error → HTTP Status Mapping

Use a typed error mapper function with exhaustive `switch` on `_tag`. This ensures compile-time safety when new error variants are added:

```ts
// features/board/presentation/http/error-mapper.ts
import type { BoardError } from "../../domain/board.errors";

export interface ErrorResponse {
  status: number;
  body: string | null;
}

export function mapBoardError(error: BoardError): ErrorResponse {
  switch (error._tag) {
    case "BoardNotFound":
      return { status: 404, body: null };
    case "BoardAccessDenied":
      return { status: 403, body: null };
    case "BoardForbidden":
      return { status: 403, body: null };
    case "InviteExpired":
      return { status: 410, body: "Invite expired" };
    case "InviteInvalid":
      return { status: 404, body: "Invite not found" };
    case "InviteAlreadyMember":
      return { status: 409, body: "Already a member" };
    case "MemberIsOwner":
      return { status: 400, body: "Cannot remove owner" };
    case "OwnerRequired":
      return { status: 403, body: "Owner permission required" };
  }
}
```

Usage in controllers:

```ts
if (result.isErr()) {
  const { status, body } = mapBoardError(result.error);
  return new Response(body, { status });
}
```

| Error Pattern                  | HTTP Status |
| ------------------------------ | ----------- |
| `*NotFound`                    | 404         |
| `*AccessDenied` / `*Forbidden` | 403         |
| `*Invalid`                     | 400 or 404  |
| `*Expired`                     | 410         |
| Anything else                  | 500         |

## Zod Schema Pattern

Define Zod schemas for transport validation in `dtos/` files:

```ts
// features/board/presentation/http/dtos/board-request.dto.ts
import { z } from "zod";

export const createBoardSchema = z.object({
  title: z.string().min(1).max(200),
  visibility: z.enum(["public", "private"]).optional(),
});

export const updateBoardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export const boardIdParamsSchema = z.object({
  id: z.string().min(1),
});

// Infer TypeScript types from schemas
export type CreateBoardRequest = z.infer<typeof createBoardSchema>;
export type UpdateBoardRequest = z.infer<typeof updateBoardSchema>;
```

### Rules

- Schema variables: `camelCase` + `Schema` suffix (`createBoardSchema`)
- Type exports: `*Request` suffix via `z.infer`
- All validation rules in the schema (min/max/optional/enum)
- Pass schemas to Elysia route config: `{ body: createBoardSchema }`

## Auth Plugin (Macro)

The `authPlugin` provides two macros for route-level auth:

```ts
// shared/presentation/plugins/auth.plugin.ts
export const authPlugin = new Elysia({ name: "auth" }).macro({
  resolveSession: {
    // Nullable session — works for anonymous
    resolve: async ({ request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      return { session };
    },
  },
  auth: {
    // Required auth — returns 401 if missing
    beforeHandle: async ({ request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) return new Response("Unauthorized", { status: 401 });
    },
    resolve: async ({ request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      return { session: session! };
    },
  },
});
```

### Usage

```ts
// Anonymous access (public board viewing)
.get("/:id", handler, { resolveSession: true })
// session is nullable — check session?.user?.id

// Required auth (creating boards)
.post("/", handler, { auth: true })
// session is guaranteed non-null — use session.user.id directly
```

## Transport DTO Mapper

A separate mapper converts between transport DTOs and application DTOs:

```ts
// features/board/presentation/http/mappers/board.mapper.ts
import type { GetBoardOutput } from "../../../application/board.dtos";

export function toGetBoardResponse(output: GetBoardOutput): GetBoardOutput {
  return output; // Often a pass-through; add transform logic as needed
}
```

In practice, many mappers are pass-throughs since application DTOs already use primitives. They exist for the cases where transport shape differs from application shape.

## WebSocket Controller

WebSocket routes follow the same thin-controller pattern. The collab sub-module uses a typed `WSContext` port and `Symbol`-based context attachment:

```ts
// features/board/collab/presentation/collab-ws.controller.ts
import type { ICollabService } from "../application/ports/i-collab-service.port";
import type { WSContext } from "../application/ports/ws-context.port";

const WS_CONTEXT_KEY = Symbol.for("vboard:wsContext");

export function createCollabWsController(collabService: ICollabService) {
  return new Elysia().ws("/ws/collab/:boardId", {
    async open(ws) {
      const session = await auth.api.getSession({ headers: ws.data.headers });
      const ctx: WSContext = {
        raw: ws.raw,
        userId: session?.user?.id ?? null,
        boardMeta: null,
      };
      attachContext(ws.raw, ctx);
      await collabService.handleConnection(ctx, ws.data.params.boardId);
    },
    message(ws, message) {
      const ctx = getContext(ws.raw);
      if (!ctx) return;
      collabService.handleMessage(ctx, message);
    },
    close(ws) {
      const ctx = getContext(ws.raw);
      if (!ctx) return;
      collabService.handleDisconnect(ctx);
    },
  });
}
```

The WS controller delegates to `ICollabService` which orchestrates authorization (via `ConnectCollabCommand`) and Yjs document management (via `IYDocRegistry`). All stateful logic lives in infrastructure, not the controller.
