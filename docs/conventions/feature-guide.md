# Feature Guide: Adding a New Feature

This guide walks through adding a new feature (e.g., **"Comments"**) to `packages/api`. Each step includes a copy-paste-ready template. All paths are relative to `packages/api/src/`.

## Step 1: Create the Directory Structure

```bash
mkdir -p features/comment/domain/entities
mkdir -p features/comment/domain/value-objects
mkdir -p features/comment/application/ports
mkdir -p features/comment/application/usecases/queries
mkdir -p features/comment/application/usecases/commands
mkdir -p features/comment/infrastructure/mappers
mkdir -p features/comment/infrastructure/repositories
mkdir -p features/comment/presentation/http/dtos
mkdir -p features/comment/presentation/http/mappers
```

## Step 2: Domain — Value Objects

Create branded types for IDs. If the VO has behavior (enum-like), use a class.

**Branded ID** — `features/comment/domain/value-objects/comment-id.vo.ts`:

```ts
import { type Brand, make } from "../../../../shared/kernel/types/brand";

export type CommentIdVO = Brand<string, "CommentId">;

export const CommentIdVO = {
  create: (id: string): CommentIdVO => make<CommentIdVO>(id),
};
```

**Enum-like VO** — only if you need behavior (permissions, equality, serialization):

```ts
export class CommentStatusVO {
  static readonly ACTIVE = new CommentStatusVO("active");
  static readonly ARCHIVED = new CommentStatusVO("archived");

  private constructor(public readonly value: "active" | "archived") {}

  equals(other: CommentStatusVO): boolean {
    return this.value === other.value;
  }

  static fromString(value: string): CommentStatusVO {
    switch (value) {
      case "active":
        return CommentStatusVO.ACTIVE;
      case "archived":
        return CommentStatusVO.ARCHIVED;
      default:
        throw new Error(`Invalid CommentStatus: ${value}`);
    }
  }
}
```

Create barrel `features/comment/domain/value-objects/index.ts`.

## Step 3: Domain — Errors

`features/comment/domain/comment.errors.ts`:

```ts
import { TaggedError } from "better-result";

export class CommentNotFoundError extends TaggedError("CommentNotFound")<{
  commentId: string;
}>() {}

export class CommentForbiddenError extends TaggedError("CommentForbidden")<{
  commentId: string;
  userId: string;
  action: string;
}>() {}

export type CommentError = CommentNotFoundError | CommentForbiddenError;
```

**Pattern**: One `TaggedError` per distinct error case, with a typed payload. Export a union type `CommentError`.

## Step 4: Domain — Entity

`features/comment/domain/entities/comment.entity.ts`:

```ts
import type { CommentIdVO } from "../value-objects/comment-id.vo";
import { Result } from "better-result";

export class CommentEntity {
  private constructor(
    public readonly id: CommentIdVO,
    public readonly boardId: string,
    public readonly authorId: string,
    public text: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  /** Create — validates new comments */
  static create(
    id: CommentIdVO,
    boardId: string,
    authorId: string,
    text: string,
    now: Date,
  ): Result<CommentEntity, string> {
    if (!text || text.trim().length === 0) {
      return Result.err("Comment text is required");
    }
    return Result.ok(
      new CommentEntity(id, boardId, authorId, text.trim(), now, now),
    );
  }

  /** Restore — trusts DB data */
  static restore(
    id: CommentIdVO,
    boardId: string,
    authorId: string,
    text: string,
    createdAt: Date,
    updatedAt: Date,
  ): CommentEntity {
    return new CommentEntity(id, boardId, authorId, text, createdAt, updatedAt);
  }

  /** Pure mutation — no auth check */
  updateText(text: string, now: Date): void {
    this.text = text;
    this.updatedAt = now;
  }
}
```

**Key rules**:

- `private constructor` — always use `create()` or `restore()`
- `create()` validates, `restore()` trusts
- Mutations are pure (no auth, no `new Date()`, accept `now: Date` parameter)
- Auth checks live in use cases, not entities

Create barrel `features/comment/domain/entities/index.ts` and `features/comment/domain/index.ts`.

## Step 5: Application — Port

`features/comment/application/ports/i-comment.repository.ts`:

```ts
import type { CommentEntity } from "../../domain/entities/comment.entity";
import type { CommentIdVO } from "../../domain/value-objects/comment-id.vo";

export interface ICommentRepository {
  findById(id: CommentIdVO): Promise<CommentEntity | null>;
  findByBoardId(boardId: string): Promise<CommentEntity[]>;
  create(comment: CommentEntity): Promise<CommentEntity>;
  update(comment: CommentEntity): Promise<void>;
  delete(id: CommentIdVO): Promise<void>;
}
```

**Pattern**: `I*Repository` interface name, methods accept/return domain entities, never DB rows.

## Step 6: Application — DTOs

`features/comment/application/comment.dtos.ts`:

```ts
export interface ListCommentsInput {
  boardId: string;
}

export interface ListCommentsOutput {
  comments: Array<{
    id: string;
    boardId: string;
    authorId: string;
    text: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export interface CreateCommentInput {
  boardId: string;
  text: string;
  userId: string;
}

export interface CreateCommentOutput {
  id: string;
  boardId: string;
  authorId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Step 7: Application — Use Cases

**Query** — `features/comment/application/usecases/queries/list-comments.query.ts`:

```ts
import type { Result } from "better-result";
import type { CommentError } from "../../../domain/comment.errors";
import type { ListCommentsInput, ListCommentsOutput } from "../../comment.dtos";
import type { ICommentRepository } from "../../ports/i-comment.repository";

export class ListCommentsQuery {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(
    input: ListCommentsInput,
  ): Promise<Result<ListCommentsOutput, CommentError>> {
    import { Result } from "better-result";
    import { unbrand } from "../../../../../shared/kernel/types";
    const comments = await this.commentRepo.findByBoardId(input.boardId);
    return Result.ok({
      comments: comments.map((c) => ({
        id: unbrand(c.id),
        boardId: c.boardId,
        authorId: c.authorId,
        text: c.text,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  }
}
```

**Command** — `features/comment/application/usecases/commands/create-comment.command.ts`:

```ts
import type { Result } from "better-result";
import type { CommentError } from "../../../domain/comment.errors";
import type {
  CreateCommentInput,
  CreateCommentOutput,
} from "../../comment.dtos";
import type { ICommentRepository } from "../../ports/i-comment.repository";
import type { IIdGenerator } from "../../../../../shared/application/interfaces/i-id-generator";
import type { IDateProvider } from "../../../../../shared/application/interfaces/i-date-provider";
import { CommentEntity } from "../../../domain/entities/comment.entity";
import { CommentIdVO } from "../../../domain/value-objects/comment-id.vo";
import { Result } from "better-result";
import { unbrand } from "../../../../../shared/kernel/types";

export class CreateCommentCommand {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly dateProvider: IDateProvider,
  ) {}

  async execute(
    input: CreateCommentInput,
  ): Promise<Result<CreateCommentOutput, CommentError>> {
    const now = this.dateProvider.now();
    const id = CommentIdVO.create(this.idGenerator.generate());

    const entityResult = CommentEntity.create(
      id,
      input.boardId,
      input.userId,
      input.text,
      now,
    );
    if (entityResult.isErr()) {
      // Entity validation returns string errors
      return Result.err(entityResult.error as unknown as CommentError);
    }

    const saved = await this.commentRepo.create(entityResult.unwrap());
    return Result.ok({
      id: unbrand(saved.id),
      boardId: saved.boardId,
      authorId: saved.authorId,
      text: saved.text,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    });
  }
}
```

**Use `IUnitOfWork` only when the command spans multiple repos atomically.**

## Step 8: Infrastructure — Mapper

`features/comment/infrastructure/mappers/comment.mapper.ts`:

```ts
import { CommentEntity } from "../../domain/entities/comment.entity";
import { CommentIdVO } from "../../domain/value-objects/comment-id.vo";

type CommentRow = {
  id: string;
  boardId: string;
  authorId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
};

export function toCommentDomain(row: CommentRow): CommentEntity {
  return CommentEntity.restore(
    CommentIdVO.create(row.id),
    row.boardId,
    row.authorId,
    row.text,
    row.createdAt,
    row.updatedAt,
  );
}
```

## Step 9: Infrastructure — Repository

`features/comment/infrastructure/repositories/drizzle-comment.repository.ts`:

```ts
import type { ICommentRepository } from "../../application/ports/i-comment.repository";
import type { CommentEntity } from "../../domain/entities/comment.entity";
import type { CommentIdVO } from "../../domain/value-objects/comment-id.vo";
import { db } from "../../../../shared/infrastructure/database";
import { txStorage } from "../../../../shared/infrastructure/database/transaction-context";
import { comment } from "@vboard/db/schema/comment"; // Your Drizzle schema
import { eq } from "drizzle-orm";
import { toCommentDomain } from "../mappers/comment.mapper";
import { unbrand } from "../../../../shared/kernel/types";

export class DrizzleCommentRepository implements ICommentRepository {
  async findById(id: CommentIdVO): Promise<CommentEntity | null> {
    const rows = await this.getDb()
      .select()
      .from(comment)
      .where(eq(comment.id, unbrand(id)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return toCommentDomain(row);
  }

  // ... other methods

  /** Use transaction if in AsyncLocalStorage, otherwise bare db */
  private getDb() {
    return txStorage.getStore() ?? db;
  }
}
```

## Step 10: Presentation — Zod Schemas

`features/comment/presentation/http/dtos/comment-request.dto.ts`:

```ts
import { z } from "zod";

export const createCommentSchema = z.object({
  text: z.string().min(1).max(2000),
});

export type CreateCommentRequest = z.infer<typeof createCommentSchema>;
```

## Step 11: Presentation — Controller

`features/comment/presentation/http/comment.controller.ts`:

```ts
import Elysia from "elysia";
import { authPlugin } from "../../../../shared/presentation/plugins/auth.plugin";
import type { ListCommentsQuery } from "../../application/usecases/queries/list-comments.query";
import type { CreateCommentCommand } from "../../application/usecases/commands/create-comment.command";
import { createCommentSchema } from "./dtos/comment-request.dto";

export function createCommentController(deps: {
  listComments: ListCommentsQuery;
  createComment: CreateCommentCommand;
}) {
  return new Elysia({ prefix: "/comment" })
    .use(authPlugin)
    .get(
      "/:boardId",
      async ({ params }) => {
        const result = await deps.listComments.execute({
          boardId: params.boardId,
        });
        if (result.isErr()) return new Response(null, { status: 500 });
        return result.unwrap().comments;
      },
      { auth: true },
    )
    .post(
      "/",
      async ({ body, session }) => {
        const result = await deps.createComment.execute({
          boardId: body.boardId,
          text: body.text,
          userId: session.user.id,
        });
        if (result.isErr()) return new Response(null, { status: 400 });
        return result.unwrap();
      },
      { auth: true, body: createCommentSchema },
    );
}
```

## Step 12: IOC — DI Wiring

`features/comment/comment.ioc.ts`:

```ts
import Elysia from "elysia";
import { DrizzleCommentRepository } from "./infrastructure/repositories/drizzle-comment.repository";
import { ListCommentsQuery } from "./application/usecases/queries/list-comments.query";
import { CreateCommentCommand } from "./application/usecases/commands/create-comment.command";
import { createCommentController } from "./presentation/http/comment.controller";
import type { IIdGenerator } from "../../shared/application/interfaces/i-id-generator";
import type { IDateProvider } from "../../shared/application/interfaces/i-date-provider";

export function createCommentModule(deps: {
  idGenerator: IIdGenerator;
  dateProvider: IDateProvider;
}) {
  const commentRepo = new DrizzleCommentRepository();
  const listComments = new ListCommentsQuery(commentRepo);
  const createComment = new CreateCommentCommand(
    commentRepo,
    deps.idGenerator,
    deps.dateProvider,
  );
  const controller = createCommentController({ listComments, createComment });

  return new Elysia({ name: "comment-module" }).use(controller);
}
```

## Step 13: Register in Bootstrap

Add to `packages/api/src/bootstrap/app.ts`:

```ts
import { createCommentModule } from "../features/comment/comment.ioc";

// Inside createApp():
const commentModule = createCommentModule({ idGenerator, dateProvider });

// In the app chain:
  .use(commentModule)
```

## Step 14: Add DB Schema (in `packages/db`)

Create the Drizzle table schema in `packages/db/src/schema/comment.ts`, then run:

```bash
bun run db:push
```

## Step 15: Write Tests

See [Testing](./testing.md) for the test patterns. Key files to create:

- `features/comment/domain/entities/comment.entity.test.ts`
- `features/comment/application/__mocks__/mock-comment.repository.ts`

## Checklist

- [ ] Directory structure created
- [ ] Value objects (branded IDs, enum-like VOs)
- [ ] Errors (TaggedError per case + union type)
- [ ] Entity (private constructor, create/restore, pure mutations)
- [ ] Port interface (I\*Repository)
- [ ] DTOs (Input/Output interfaces)
- [ ] Queries (read-only use cases)
- [ ] Commands (write use cases, UoW if multi-repo)
- [ ] Mapper (DB row → entity via restore())
- [ ] Repository (Drizzle impl, getDb() for tx)
- [ ] Zod schemas (transport validation)
- [ ] Controller (thin, delegates to use cases)
- [ ] IOC (plugin factory, wires everything)
- [ ] Registered in bootstrap/app.ts
- [ ] DB schema added to packages/db
- [ ] Tests written
- [ ] `bun run check-types` passes
