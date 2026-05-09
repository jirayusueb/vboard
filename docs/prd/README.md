# VBoard — Product Requirements Document

## 1. Document Info

| Field   | Value                             |
| ------- | --------------------------------- |
| Product | VBoard — Collaborative Whiteboard |
| Version | 1.0                               |
| Author  | Engineering Team                  |
| Date    | 2025-05-09                        |
| Status  | Approved                          |

---

## 2. Overview

VBoard is a **real-time collaborative whiteboard** built into the existing VBoard monorepo. Users create boards (private or public), invite collaborators via shareable links, and draw together in real-time using **Excalidraw** as the drawing engine and **Yjs CRDT** for conflict-free state synchronization.

**Why are we building this?** The VBoard platform currently offers auth and a basic todo demo. Adding a collaborative whiteboard serves as the core product differentiator — it demonstrates real-time multi-user capability, complex state management, and a polished drawing experience. This is the primary user-facing feature that turns VBoard from a demo into a usable product.

**High-level goal:** Ship a production-quality collaborative whiteboard where multiple users can draw simultaneously with sub-500ms sync latency, zero data loss, and dead-simple invite-based sharing.

---

## 3. Objectives & Success Metrics

### Business Objectives

- Establish VBoard as a functional collaborative tool, not just a tech demo
- Provide a showcase feature that demonstrates the monorepo architecture (Elysia, TanStack Start, Drizzle, better-auth)
- Enable user-to-user collaboration as the core retention driver

### Product Objectives (User-focused)

- A user can go from "sign up" to "drawing with a teammate" in under 60 seconds
- Collaborative drawing feels instantaneous — no visible lag for local edits
- Sharing a board requires exactly one link, zero configuration
- Board data survives server restarts and browser crashes

### Key Results / KPIs

| KPI                                       | Target           | Measurement                                              |
| ----------------------------------------- | ---------------- | -------------------------------------------------------- |
| Sync latency (local edit → remote render) | < 500ms p95      | Client-side telemetry on Yjs update round-trip           |
| Data loss rate                            | 0 incidents      | No user reports of lost drawings after snapshot recovery |
| Invite conversion rate                    | > 80%            | % of opened invite links that result in a new member     |
| Board creation rate                       | ≥ 1 per new user | % of signed-up users who create at least one board       |
| Collaboration rate                        | ≥ 30%            | % of boards with ≥ 2 members                             |
| Excalidraw load time                      | < 3s             | Time from page load to interactive canvas (lazy-loaded)  |

---

## 4. Problem Statement

### User Pain Points

1. **No collaborative creative tool.** Users sign up and see a todo list — nothing that showcases the platform's capabilities or encourages them to stay.
2. **No real-time features.** The existing app has no WebSocket usage, no multiplayer, no live collaboration. Users interact with static data.
3. **No sharing mechanism.** There's no way for users to invite others or collaborate on anything together. The platform is single-player.

### Business Impact

Without a compelling collaborative feature, VBoard remains a technical demo with no product-market fit. Users sign up, see todos, and leave. A real-time whiteboard is the simplest high-impact feature that demonstrates the platform's value proposition.

---

## 5. User Personas / Target Audience

### Primary: Alex (Team Lead)

- **Role**: Manages a small team (3-8 people)
- **Needs**: Quick visual brainstorming, architecture diagrams, wireframes
- **Behavior**: Creates a board, shares the link in Slack, team joins and draws together
- **Success criteria**: Can sketch an idea and get team feedback in real-time

### Secondary: Sam (Solo Creator)

- **Role**: Individual contributor or student
- **Needs**: Personal whiteboard for notes, diagrams, planning
- **Behavior**: Creates private boards, uses them as a persistent canvas
- **Success criteria**: Can create and return to boards without losing work

### Tertiary: Pat (Invitee)

- **Role**: Receives an invite link from Alex
- **Needs**: View or edit a board without friction
- **Behavior**: Clicks link → signs up (if needed) → lands directly on the board
- **Success criteria**: From link click to drawing in < 30 seconds

---

## 6. Requirements

### Functional Requirements

#### Board Management

- **FR-1**: As a logged-in user, I want to create a new board with a title and visibility (public/private) so that I can start drawing
- **FR-2**: As a logged-in user, I want to see a list of all boards I'm a member of so that I can find my boards
- **FR-3**: As a board owner, I want to update the board title and visibility so that I can manage its settings
- **FR-4**: As a board owner, I want to delete a board so that I can remove boards I no longer need
- **FR-5**: When a board is deleted, all members, snapshots, and invites must be cascade-deleted

#### Access Control

- **FR-6**: Public boards are viewable by anyone (including anonymous users)
- **FR-7**: Private boards are only accessible to members
- **FR-8**: Each board has exactly one owner (transferable)
- **FR-9**: Owner can invite new members with editor or viewer role
- **FR-10**: Owner can remove members (except themselves as owner)
- **FR-11**: Owner can transfer ownership to an existing member (owner becomes editor)
- **FR-12**: Viewers see the board in read-only mode (cannot push edits)

#### Real-Time Collaboration

- **FR-13**: As an editor, I want to draw on the canvas and see other editors' changes in real-time so that we can collaborate
- **FR-14**: As a viewer, I want to see editors drawing in real-time so that I can follow along
- **FR-15**: Edits must be synchronized using CRDT (Yjs) so that conflicts are resolved automatically
- **FR-16**: Board state must persist across sessions so that no data is lost on disconnect

#### Invite System

- **FR-17**: As a board owner, I want to generate a shareable invite link with a role (editor/viewer) so that I can invite collaborators
- **FR-18**: As an invitee, I want to open an invite link and be automatically added as a board member so that I can start collaborating immediately
- **FR-19**: Invites are single-use — deleted after successful claim
- **FR-20**: Invites may optionally have an expiry time
- **FR-21**: If an invitee is already a member, redirect them to the board without error

#### Persistence

- **FR-22**: Board canvas state must be saved as a Yjs snapshot when the last user disconnects
- **FR-23**: Board canvas state must be saved periodically (every 60 seconds) while users are connected
- **FR-24**: When a board is opened, the latest snapshot must be loaded to restore the previous state

### Non-Functional Requirements

| Category            | Requirement                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Performance**     | Local edit latency < 100ms. Remote sync < 500ms p95. Excalidraw lazy-loaded in < 3s.                                                 |
| **Reliability**     | Zero data loss — all edits captured by CRDT + snapshot persistence                                                                   |
| **Scalability**     | Server handles ≥ 50 concurrent WebSocket connections per board. In-memory Y.Doc destroyed when last user disconnects to free memory. |
| **Security**        | All protected routes require valid session cookie. WebSocket connections authenticated on upgrade. No invite token reuse.            |
| **Browser support** | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+                                                                                        |
| **Accessibility**   | Relies on Excalidraw's built-in keyboard navigation. Board list follows standard web accessibility.                                  |

---

## 7. User Stories & Acceptance Criteria

### US-1: Create a Board

**Story**: As a logged-in user, I want to create a new board so that I can start drawing.

**Acceptance Criteria**:

- Given I am logged in, when I click "New Board" and enter a title, then a board is created with me as the owner
- Given I create a board with visibility "private", then only I can access it
- Given I create a board with visibility "public", then anyone with the link can view it
- Given a board is created, then I am automatically redirected to the editor page

### US-2: Draw Collaboratively

**Story**: As an editor on a board, I want to draw and see other editors' changes in real-time so that we can collaborate.

**Acceptance Criteria**:

- Given I am an editor on a board, when I draw a shape, then other connected editors see it within 500ms
- Given I am a viewer on a board, when an editor draws, then I see the update in real-time
- Given I am a viewer, when I try to draw, then the canvas is in view-only mode
- Given two editors draw simultaneously, then both edits are preserved (CRDT merge)

### US-3: Share via Invite Link

**Story**: As a board owner, I want to generate a shareable invite link so that I can invite collaborators.

**Acceptance Criteria**:

- Given I am the owner, when I generate an invite for "editor" role, then a unique URL is returned
- Given an invitee opens the link while logged in, then they are added as a member with the invite's role and redirected to the board
- Given an invite has been claimed, when someone opens the same link, then they get a 404
- Given an invite has expired, when someone opens the link, then they see an "Invite expired" message

### US-4: Manage Members

**Story**: As a board owner, I want to view and remove members so that I can control who has access.

**Acceptance Criteria**:

- Given I am the owner, when I view the member list, then I see all members with their roles
- Given I am the owner, when I remove a member, then they lose access immediately
- Given I try to remove the owner (myself), then the action is rejected with a 400 error
- Given I am not the owner, when I try to manage members, then I get a 403 error

### US-5: Transfer Ownership

**Story**: As a board owner, I want to transfer ownership to another member so that responsibility can be handed off.

**Acceptance Criteria**:

- Given I am the owner, when I transfer to an existing member, then they become the new owner and I become an editor
- Given I try to transfer to a non-member, then the action is rejected with a 400 error
- Given I am not the owner, when I try to transfer, then I get a 403 error

### US-6: Board Persists Across Sessions

**Story**: As a user, I want my board to be saved automatically so that I don't lose my work.

**Acceptance Criteria**:

- Given I am drawing on a board, when I close my browser, then the board state is saved (snapshot on last disconnect)
- Given a board has a saved snapshot, when I open it again, then the canvas shows my previous work
- Given multiple users are drawing, when the server restarts, then the latest periodic snapshot (≤ 60s old) is restored

---

## 8. Out of Scope (v1)

The following are **explicitly not included** in v1 to prevent scope creep:

- ❌ Public gallery / board discovery / search
- ❌ Real-time cursor presence (who is online, cursor positions)
- ❌ Board templates or starter boards
- ❌ Version history / branching / named snapshots
- ❌ Offline-first with edit queue & replay
- ❌ Comments, annotations, or threaded discussions
- ❌ Export to PNG/SVG/PDF (users can use Excalidraw's built-in export)
- ❌ Team or organization management
- ❌ Board thumbnails / preview images
- ❌ Webhook or API integrations
- ❌ Rate limiting or abuse protection (v2)
- ❌ Board duplication / fork
- ❌ Custom permissions (e.g., "can comment but not edit")

---

## 9. Assumptions & Dependencies

### Technical Dependencies

| Dependency              | Version | Risk                        | Mitigation                     |
| ----------------------- | ------- | --------------------------- | ------------------------------ |
| Yjs                     | ^13.6   | Stable, well-maintained     | None needed                    |
| Excalidraw              | ^0.18   | Large bundle (~2MB)         | Lazy-loaded, no SSR            |
| @mizuka-wu/y-excalidraw | ^2.0    | Community-maintained        | Fallback: build custom binding |
| @y/protocols            | ^1.0.6  | Low-level, stable           | None needed                    |
| better-auth             | 1.6.9   | Handles sessions            | Already in use                 |
| Elysia                  | ^1.4    | Macro types have edge cases | Workaround: object shorthand   |
| PostgreSQL              | 15+     | bytea for snapshots         | Standard PG feature            |

### Team Assumptions

- Single developer (full-stack) implementing all layers
- No dedicated QA — verified via `bun run check-types` + `vite build`
- PostgreSQL instance available (local or managed)

### Business Assumptions

- Users will primarily share boards via direct link (no discovery needed)
- Board count per user will be low (< 20), so simple list is sufficient
- Most boards will have < 10 concurrent users

---

## 10. User Flows

### Flow 1: First-Time Board Creation

```
[Logged-in User]
    │
    ▼
Click "Boards" in nav
    │
    ▼
Board list page (/board)
    │
    ▼
Click "+ New Board"
    │
    ▼
Enter title, select visibility → "Create"
    │
    ▼
POST /board → board created, user is owner
    │
    ▼
Redirect to /board/:id
    │
    ▼
Excalidraw loads (lazy) → WS connects → canvas ready
```

### Flow 2: Invite & Collaborate

```
[Owner]                        [Invitee]
    │                              │
    ▼                              │
Open board settings               │
    │                              │
    ▼                              │
Click "Share" → select role       │
    │                              │
    ▼                              │
POST /board/:id/invite            │
    │                              │
    ▼                              │
Copy link, send to invitee ──────►│
    │                              ▼
    │                         Open /board/invite/:token
    │                              │
    │                              ▼
    │                         POST /board/invite/:token
    │                         → added as member
    │                              │
    │                              ▼
    │                         Redirect to /board/:id
    │                              │
    │                              ▼
    │                         WS connects → sees canvas
    │                              │
    ▼                              ▼
Both users drawing ←── sync ──► Both see updates
```

### Flow 3: View a Public Board (Anonymous)

```
[Anonymous User]
    │
    ▼
Navigate to /board/:id (via direct link)
    │
    ▼
GET /board/:id (resolveSession: true)
    │
    ▼
Board is public → return metadata with role: null
    │
    ▼
Excalidraw loads in viewModeEnabled
    │
    ▼
WS connects (read-only) → sees live updates
```

### Flow 4: Private Board Access Denied

```
[Authenticated Non-Member]
    │
    ▼
Navigate to /board/:id
    │
    ▼
GET /board/:id → 403 Forbidden
    │
    ▼
"Board not found or you don't have access"
    │
    ▼
← Back to boards
```

---

## 11. Timeline & Milestones

| Phase                | Scope                                                                                        | Status    |
| -------------------- | -------------------------------------------------------------------------------------------- | --------- |
| **M1: Foundation**   | oRPC → Eden Treaty migration, board DB schema, domain layer (entities, VOs, repos, errors)   | ✅ Done   |
| **M2: REST API**     | Board CRUD routes, invite endpoints, member management, auth macros                          | ✅ Done   |
| **M3: Real-Time**    | WebSocket handler (Yjs sync), collab service, snapshot persistence                           | ✅ Done   |
| **M4: Frontend**     | Board list page, editor page (Excalidraw wrapper), invite claim page, useCollab hook         | ✅ Done   |
| **M5: Integration**  | Server mounts all routes + WS, nav link added, type checks pass, build passes                | ✅ Done   |
| **M5.5: Clean Arch** | Refactor `packages/api` to Feature-First Clean Architecture (4-layer, CQRS-lite, DI plugins) | ✅ Done   |
| **M6: Production**   | Deploy, DB migration, smoke test in staging                                                  | 🔲 Next   |
| **v2: Polish**       | Cursor presence, board thumbnails, version history, rate limiting                            | 🔲 Future |

---

## 12. Risks & Open Questions

### Risks

| #   | Risk                                                                               | Impact                              | Likelihood | Mitigation                                                                                        |
| --- | ---------------------------------------------------------------------------------- | ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| R1  | @mizuka-wu/y-excalidraw is community-maintained, may break with Excalidraw updates | High — canvas binding fails         | Medium     | Pin versions; fallback to custom Yjs↔Excalidraw binding using Y.XmlFragment                       |
| R2  | Large Excalidraw bundle (~2MB) slows initial load                                  | Medium — poor perceived performance | Low        | Lazy-loaded with Suspense fallback; consider code-splitting Excalidraw assets                     |
| R3  | Snapshot grows large for complex boards (>1MB)                                     | Medium — slow persistence/recovery  | Low        | Yjs binary encoding is compact; add snapshot size monitoring                                      |
| R4  | No offline support — all edits lost if WS disconnects before snapshot              | High — data loss                    | Medium     | Yjs client-side state survives tab refresh; only at risk on browser crash. v2: localStorage queue |
| R5  | No rate limiting on invite generation or board creation                            | Low — abuse potential               | Medium     | v2: add rate limiting middleware                                                                  |
| R6  | Elysia macro type inference edge cases                                             | Low — developer experience          | Low        | Documented workaround: object shorthand pattern                                                   |

### Open Questions

| #   | Question                                                                                                | Status                                                                                                    | Decision Needed By |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------ |
| Q1  | Should invites support multi-use (not just single-use)?                                                 | Open                                                                                                      | v2 planning        |
| Q2  | Should we add board thumbnail generation for the list page?                                             | Open                                                                                                      | v2 planning        |
| Q3  | What's the max board count per user before pagination is needed?                                        | Open                                                                                                      | When we hit it     |
| Q4  | Should anonymous users be able to view public boards via the API, or only via WS?                       | Resolved — both REST and WS support anonymous access for public boards                                    | —                  |
| Q5  | Should snapshot cleanup be automatic (keep last N) or manual?                                           | Open                                                                                                      | v2 planning        |
| Q6  | Should board ownership be enforced on `board.owner_id` + `board_member.role`, or just `board.owner_id`? | Resolved — both: `owner_id` on board table for quick lookup, `owner` role in board_member for consistency | —                  |

---

## Appendix

- **Data Model**: See [`data-model.md`](./data-model.md) for full schema, ER diagram, and domain layer mapping
- **Architecture**: See [`architecture.md`](./architecture.md) for system design, design decisions, and sync protocol
- **API Reference**: See [`api-reference.md`](./api-reference.md) for all endpoint specifications
