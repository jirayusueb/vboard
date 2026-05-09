# Data Model

## Entity-Relationship Diagram

```
┌──────────┐       ┌──────────────────┐
│   user   │       │      board       │
│ (auth)   │◄──┐   ├──────────────────┤
└──────────┘   │   │ id: text PK      │
               │   │ title: text      │
               │   │ visibility: enum │
               │   │ owner_id: FK→user│
               │   │ created_at       │
               │   │ updated_at       │
               │   └──────┬───────────┘
               │          │
               │    ┌─────┴──────────────────┬────────────────────┐
               │    │                        │                    │
               │    ▼                        ▼                    ▼
               │  ┌──────────────────┐ ┌─────────────────┐ ┌─────────────────┐
               │  │  board_member    │ │ board_snapshot   │ │  board_invite   │
               │  ├──────────────────┤ ├─────────────────┤ ├─────────────────┤
               │  │ id: text PK      │ │ id: serial PK   │ │ id: text PK     │
               │  │ board_id: FK     │ │ board_id: FK    │ │ board_id: FK    │
               │  │ user_id: FK→user │ │ data: bytea     │ │ token: text UNQ │
               │  │ role: enum       │ │ created_at      │ │ role: enum      │
               │  │ joined_at        │ └─────────────────┘ │ created_at      │
               │  └──────────────────┘                     │ expires_at      │
               │          ▲                                └─────────────────┘
               │          │
               └──────────┘  (owner_id & user_id both reference user)
```

## Tables

### `board`

The primary entity — a collaborative whiteboard.

| Column       | Type                    | Constraints                            | Description                    |
| ------------ | ----------------------- | -------------------------------------- | ------------------------------ |
| `id`         | `text`                  | PK                                     | UUID v4, generated client-side |
| `title`      | `text`                  | NOT NULL                               | Display name, 1-200 chars      |
| `visibility` | `enum(public, private)` | NOT NULL, default `private`            | Access control scope           |
| `owner_id`   | `text`                  | FK → `user.id`, ON DELETE CASCADE      | Single owner (transferable)    |
| `created_at` | `timestamp`             | NOT NULL, default `now()`              | Creation time                  |
| `updated_at` | `timestamp`             | NOT NULL, default `now()`, auto-update | Last modification              |

**Indexes**: `board_owner_id_idx` on `owner_id`

### `board_member`

Many-to-many join between users and boards with role.

| Column      | Type                          | Constraints                        | Description             |
| ----------- | ----------------------------- | ---------------------------------- | ----------------------- |
| `id`        | `text`                        | PK                                 | UUID v4                 |
| `board_id`  | `text`                        | FK → `board.id`, ON DELETE CASCADE | Parent board            |
| `user_id`   | `text`                        | FK → `user.id`, ON DELETE CASCADE  | Member user             |
| `role`      | `enum(owner, editor, viewer)` | NOT NULL, default `viewer`         | Permission level        |
| `joined_at` | `timestamp`                   | NOT NULL, default `now()`          | When membership started |

**Unique constraint**: `(board_id, user_id)` — one membership per user per board
**Indexes**: `board_member_user_id_idx` on `user_id`

### `board_snapshot`

Stores Yjs CRDT state for persistence across sessions.

| Column       | Type        | Constraints                        | Description                                        |
| ------------ | ----------- | ---------------------------------- | -------------------------------------------------- |
| `id`         | `serial`    | PK                                 | Auto-incrementing                                  |
| `board_id`   | `text`      | FK → `board.id`, ON DELETE CASCADE | Parent board                                       |
| `data`       | `bytea`     | NOT NULL                           | Binary Yjs encoded state (`Y.encodeStateAsUpdate`) |
| `created_at` | `timestamp` | NOT NULL, default `now()`          | When snapshot was taken                            |

**Indexes**: `board_snapshot_board_id_idx` on `board_id`
**Strategy**: Append-only; latest snapshot loaded on board open. Periodic cleanup can trim old snapshots.

### `board_invite`

Single-use shareable link for adding members.

| Column       | Type                   | Constraints                        | Description                    |
| ------------ | ---------------------- | ---------------------------------- | ------------------------------ |
| `id`         | `text`                 | PK                                 | UUID v4                        |
| `board_id`   | `text`                 | FK → `board.id`, ON DELETE CASCADE | Target board                   |
| `token`      | `text`                 | NOT NULL, UNIQUE                   | UUID v4, used in invite URL    |
| `role`       | `enum(editor, viewer)` | NOT NULL, default `editor`         | Role granted on claim          |
| `created_at` | `timestamp`            | NOT NULL, default `now()`          | When invite was created        |
| `expires_at` | `timestamp`            | nullable                           | Optional expiry (null = never) |

**Indexes**: `board_invite_board_id_idx` on `board_id`, `board_invite_token_unq` on `token`

## Enums

### `board_visibility`

- `public` — anyone can view, only members can edit
- `private` — members only

### `member_role`

- `owner` — full control (one per board, stored on both `board.owner_id` and `board_member.role`)
- `editor` — can draw and modify elements
- `viewer` — read-only access

## Domain Layer Mapping

### Entities (in `packages/api/src/domain/board/entities/`)

| Entity          | Table            | Key Logic                                                                     |
| --------------- | ---------------- | ----------------------------------------------------------------------------- |
| `Board`         | `board`          | Aggregate root. Methods: `isOwnedBy()`, `updateTitle()`, `changeVisibility()` |
| `BoardMember`   | `board_member`   | Computed: `canEdit`, `canManage` (delegates to `MemberRole`)                  |
| `BoardSnapshot` | `board_snapshot` | Passive data holder                                                           |
| `BoardInvite`   | `board_invite`   | Computed: `isExpired` (checks `expiresAt`)                                    |

### Value Objects (in `packages/api/src/domain/board/value-objects/`)

| Value Object      | Type                        | Key Logic                                                      |
| ----------------- | --------------------------- | -------------------------------------------------------------- |
| `BoardId`         | Branded `string`            | Nominal typing, prevents mixing with raw strings               |
| `InviteToken`     | Branded `string`            | Same — prevents passing arbitrary strings as tokens            |
| `MemberRole`      | Class with static instances | `OWNER`, `EDITOR`, `VIEWER` with `canEdit`/`canManage` getters |
| `BoardVisibility` | Class with static instances | `PUBLIC`, `PRIVATE` with `isPublic`/`isPrivate` getters        |

### Domain Errors (TaggedError from better-result)

| Error                      | Tag                   | When                             |
| -------------------------- | --------------------- | -------------------------------- |
| `BoardNotFoundError`       | `BoardNotFound`       | Board ID doesn't exist           |
| `BoardAccessDeniedError`   | `BoardAccessDenied`   | Private board, non-member        |
| `BoardForbiddenError`      | `BoardForbidden`      | Role lacks permission for action |
| `InviteExpiredError`       | `InviteExpired`       | Invite past `expires_at`         |
| `InviteInvalidError`       | `InviteInvalid`       | Token not found                  |
| `InviteAlreadyMemberError` | `InviteAlreadyMember` | User already on the board        |

## Cascade Rules

- Deleting a board cascades to all members, snapshots, and invites
- Deleting a user cascades to all their memberships and owned boards
- Claiming an invite deletes the invite (single-use)
