# API Reference

## Authentication

All protected endpoints require a valid session cookie (`better-auth.session_token`).

The server uses Elysia macros for auth:

- Routes tagged `{ auth: true }` return `401 Unauthorized` if no session
- Routes tagged `{ resolveSession: true }` resolve session if present (nullable)
- Untagged routes are fully public

---

## Board CRUD

### List User's Boards

```
GET /board
Auth: required
```

**Response** `200`:

```json
[
  {
    "id": "uuid",
    "title": "My Board",
    "visibility": "private",
    "ownerId": "user-uuid",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### Create Board

```
POST /board
Auth: required
```

**Request Body**:

```json
{
  "title": "New Board",
  "visibility": "private" // optional, defaults to "private"
}
```

**Response** `200`:

```json
{
  "id": "uuid",
  "title": "New Board",
  "visibility": "private",
  "ownerId": "user-uuid",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Side effects**: Creates board + adds creator as `owner` member.

---

### Get Board

```
GET /board/:id
Auth: optional (resolveSession)
```

**Access control**:

- Public boards: anyone can view
- Private boards: members only (403 if not a member)
- Returns `404` if board doesn't exist

**Response** `200`:

```json
{
  "id": "uuid",
  "title": "My Board",
  "visibility": "public",
  "ownerId": "user-uuid",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "role": "editor" // null if not a member
}
```

**Error responses**:
| Status | Condition |
|--------|-----------|
| 404 | Board not found |
| 403 | Private board, non-member |

---

### Update Board

```
PATCH /board/:id
Auth: required (owner only)
```

**Request Body**:

```json
{
  "title": "Updated Title", // optional
  "visibility": "public" // optional
}
```

**Response** `200`:

```json
{ "ok": true }
```

**Error responses**:
| Status | Condition |
|--------|-----------|
| 404 | Board not found |
| 403 | Not the board owner |

---

### Delete Board

```
DELETE /board/:id
Auth: required (owner only)
```

**Side effects**: Cascade deletes all members, snapshots, and invites.

**Response** `200`:

```json
{ "ok": true }
```

**Error responses**:
| Status | Condition |
|--------|-----------|
| 404 | Board not found |
| 403 | Not the board owner |

---

## Snapshots

### Get Latest Snapshot

```
GET /board/:id/snapshot
Auth: optional (resolveSession)
```

Returns the latest Loro binary state for the board.

**Response** `200`: Binary `application/octet-stream` (Loro encoded state)

**Response** `200` (no snapshot): `{ "data": null }`

**Error responses**:
| Status | Condition |
|--------|-----------|
| 404 | Board not found or no access |

---

## Invites

### Generate Invite

```
POST /board/:id/invite
Auth: required (owner only)
```

**Request Body**:

```json
{
  "role": "editor" // "editor" or "viewer"
}
```

**Response** `200`:

```json
{ "token": "uuid-token" }
```

The invite URL is: `/board/invite/:token`

**Error responses**:
| Status | Condition |
|--------|-----------|
| 404 | Board not found |
| 403 | Not the board owner |

---

### Claim Invite

```
POST /board/invite/:token
Auth: required
```

Claims the invite and adds the authenticated user as a board member.

**Response** `200`:

```json
{
  "boardId": "uuid",
  "alreadyMember": false
}
```

**Side effects**:

- If user is not a member: adds them with invite's role, deletes invite (single-use)
- If user is already a member: returns `alreadyMember: true`, does NOT delete invite

**Error responses**:
| Status | Condition |
|--------|-----------|
| 404 | Invite token not found |
| 410 | Invite has expired |

---

## Members

### List Members

```
GET /board/:id/members
Auth: required (any member)
```

**Response** `200`:

```json
[
  {
    "id": "membership-uuid",
    "userId": "user-uuid",
    "role": "owner",
    "joinedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "id": "membership-uuid-2",
    "userId": "user-uuid-2",
    "role": "editor",
    "joinedAt": "2025-01-01T00:05:00.000Z"
  }
]
```

**Error responses**:
| Status | Condition |
|--------|-----------|
| 403 | Not a board member |

---

### Remove Member

```
DELETE /board/:id/members/:userId
Auth: required (owner only)
```

**Constraints**: Cannot remove the board owner.

**Response** `200`:

```json
{ "ok": true }
```

**Error responses**:
| Status | Condition |
|--------|-----------|
| 400 | Attempted to remove the owner |
| 403 | Not the board owner |

---

### Transfer Ownership

```
POST /board/:id/transfer
Auth: required (owner only)
```

**Request Body**:

```json
{
  "newOwnerId": "user-uuid"
}
```

**Side effects**:

1. Target user becomes `owner`
2. Current owner becomes `editor`
3. `board.owner_id` updated to new owner

**Response** `200`:

```json
{ "ok": true }
```

**Error responses**:
| Status | Condition |
|--------|-----------|
| 400 | Target user is not a board member |
| 403 | Not the board owner |

---

## WebSocket Collaboration

### Connect

```
WS /ws/collab/:boardId
Auth: session cookie (validated on open)
```

**Protocol**: Binary frames using custom Loro sync protocol.

**Message types**:

| Type | Name      | Direction     | Payload                                    |
| ---- | --------- | ------------- | ------------------------------------------ |
| 0    | Sync      | Bidirectional | Loro update (imported and re-broadcast)         |
| 1    | Awareness | Bidirectional | Awareness state updates                    |

**Lifecycle**:

1. Client connects with session cookie
2. Server validates auth + board access
3. Server sends sync step 1 (state vector)
4. Client responds with sync step 2 (missing state)
5. Both exchange updates as drawing happens
6. On disconnect: if last user, server persists snapshot and destroys doc

**Read-only connections** (viewers):

- Sync messages from client are silently dropped
- Awareness and incoming updates still flow

**Error close codes**:
| Code | Meaning |
|------|---------|
| 4403 | Access denied (not a member of private board) |

---

## Legacy Endpoints

These endpoints existed before the board feature and remain functional:

| Method   | Path               | Auth | Description                 |
| -------- | ------------------ | :--: | --------------------------- |
| `GET`    | `/rpc/healthCheck` |  ❌  | Returns `"OK"`              |
| `GET`    | `/rpc/privateData` |  ✅  | Returns `{ message, user }` |
| `GET`    | `/todo`            |  ❌  | List all todos              |
| `POST`   | `/todo`            |  ❌  | Create todo                 |
| `PATCH`  | `/todo/:id`        |  ❌  | Toggle completed            |
| `DELETE` | `/todo/:id`        |  ❌  | Delete todo                 |
| `ALL`    | `/api/auth/*`      |  ❌  | better-auth handler         |
