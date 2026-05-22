# Research & Implementation Plan: Loro CRDT Optimization, Low Latency & Web Error Handling

## Context

The Yjs → Loro migration is complete. The system works end-to-end but has significant gaps in **latency optimization**, **error handling**, **server efficiency**, and **robustness**. This plan addresses all four areas across 4 phases.

### Current Issues

| Area | Problem | Impact |
|---|---|---|
| **Latency** | No debouncing — every `onChange` → immediate WS send | High network traffic, potential WS queue buildup |
| **Reconnection** | Client has zero reconnect logic — WS close = permanent disconnect | User must reload page on any network blip |
| **Error handling** | All errors silently swallowed (`catch {}`) on both sides | Impossible to debug sync failures |
| **Server persist** | `persistSnapshot` on every message AND 5s timer | Redundant DB writes, bloated I/O |
| **Memory** | Docs kept in memory forever (no eviction) | Memory leak for long-running servers |
| **Dead code** | `subscribeLocalUpdates` on `LoroSharedDoc` never fires (server never creates local ops) | Confusion, unnecessary handler |
| **Peer IDs** | Neither client nor server sets explicit `setPeerId()` | Random peer IDs per instance — fine but not auditable |
| **Import status** | `import()` return value `{ success, pending }` ignored | Missing dependency detection skipped |

---

## Phase 1: Error Handling & Reconnection (Client + Server)

### 1.1 Client WebSocket Reconnection

**File**: `apps/web/src/features/board/collab.ts`

**Changes**:
- Add exponential backoff reconnection (500ms → 1s → 2s → 4s → max 15s) with jitter
- On reconnect: re-fetch HTTP snapshot, then reconnect WS
- Connection state machine: `connecting → connected → reconnecting → disconnected`
- Expose state to React via the hook return value
- Pause reconnect attempts while `navigator.onLine === false`, resume on `online` event
- Track `serverVersionRef` and send version vector after reconnect to request missed updates

```
Connection states:
- "connecting"    → initial load
- "connected"     → WS open, synced
- "reconnecting"  → WS closed, retrying with backoff  
- "disconnected"  → fatal error or component unmount
```

**Wire protocol enhancement**: On WS open, client sends its current version vector so server can send incremental `export({ mode: "update", from: clientVersion })` instead of full snapshot. This reduces initial sync payload for reconnects.

### 1.2 Server Error Logging & Close Codes

**File**: `packages/api/.../loro-doc-registry.ts`

**Changes**:
- Replace `catch {}` in `handleMessage` with structured logging via `evlog` (already used in the server)
- Log import failures with board ID, peer info, payload size
- Check `import()` return value for `pending` operations — log a warning if dependencies are missing
- Add meaningful WS close codes in `closeConn()`:
  - `4403` — auth failure (already used in `CollabService`)
  - `4413` — rate limited (future)
  - `4000` — invalid update payload
  - `1000` — normal close

### 1.3 Server Heartbeat / Dead Connection Detection

**File**: `packages/api/.../collab-ws.controller.ts`

**Changes**:
- Add periodic ping/pong (30s interval) using Bun's built-in WS ping
- Track last pong time per connection
- Close connections that haven't responded within 60s

### 1.4 Client Error Boundary

**File**: `apps/web/src/features/board/excalidraw-wrapper.tsx` (new wrapper)

**Changes**:
- Add a React error boundary around the Excalidraw canvas
- Catch Loro WASM initialization failures, rendering errors
- Show user-friendly error UI with retry button
- Log errors to console with context

### 1.5 Rate Limiting & Message Size Limits

**File**: `packages/api/.../loro-doc-registry.ts`

**Changes**:
- Add per-connection rate limit: max 60 messages/second (configurable)
- Add max message size: 256 KiB (matches Loro protocol limit)
- Drop messages exceeding limits, log warning, close connection on persistent abuse

---

## Phase 2: Low Latency Optimization

### 2.1 Client Update Batching

**File**: `apps/web/src/features/board/collab.ts`

**Current**: `subscribeLocalUpdates` sends each update immediately over WS.

**Change**: Buffer updates and flush on a 16ms interval (1 animation frame) or when buffer exceeds 16 KiB. This batches rapid drawing strokes into single WS messages.

```typescript
// Pseudocode
let updateBuffer: Uint8Array[] = [];
let flushTimer: number | null = null;

subscribeLocalUpdates((update) => {
  updateBuffer.push(update);
  if (!flushTimer) {
    flushTimer = setTimeout(flushUpdates, 16); // ~1 frame
  }
});

function flushUpdates() {
  if (ws.readyState === OPEN && updateBuffer.length > 0) {
    // Merge updates: commit buffer, export once
    const merged = mergeUpdates(updateBuffer);
    ws.send(prefixSync(merged));
    updateBuffer = [];
  }
  flushTimer = null;
}
```

### 2.2 Version Vector Exchange on Connect

**File**: `apps/web/src/features/board/collab.ts` (client), `packages/api/.../loro-doc-registry.ts` (server)

**Current**: Client loads HTTP snapshot, connects WS, server sends full snapshot.

**Change**: 
- Client sends its version vector as the first WS message after connect
- Server sends `export({ mode: "update", from: clientVersion })` — only the delta
- Falls back to full snapshot if version is too old or unknown
- Reduces initial sync from full snapshot to incremental update on reconnects

Wire protocol addition: `0x02` message type = version vector exchange.

### 2.3 Optimize LoroExcalidrawBinding Diffing

**File**: `apps/web/src/features/board/loro-excalidraw-binding.ts`

**Current**: `applyElementDiff` iterates all elements, compares `version` field.

**Optimization ideas** (research needed):
- [ ] Use Loro's `doc.subscribe()` event system to get granular change events instead of scanning all elements
- [ ] Track changed indices from Excalidraw's `onChange` callback (it provides `elements`, `state`, `delta`)
- [ ] Only update the changed elements in the LoroList, not scan all

### 2.4 Server: Remove Dead subscribeLocalUpdates Handler

**File**: `packages/api/.../loro-doc-registry.ts` → `LoroSharedDoc` constructor

**Current**: `this.doc.subscribeLocalUpdates(...)` broadcasts to all conns. But server never creates local ops — it only imports remote ones and broadcasts explicitly in `handleMessage()`.

**Change**: Remove the `subscribeLocalUpdates` handler from `LoroSharedDoc`. All broadcasting is already done explicitly in `handleMessage()`.

---

## Phase 3: Server Efficiency

### 3.1 Optimize Snapshot Persistence Strategy

**File**: `packages/api/.../loro-doc-registry.ts`

**Current**: `persistSnapshot()` called on every `handleMessage` AND 5s timer.

**Change**: 
- Remove `persistSnapshot()` from `handleMessage()` — only persist on:
  - Last disconnect (already implemented)
  - Periodic timer (every 30s, up from 5s)
  - Doc eviction
- This reduces DB writes from ~200/min (with active editing) to ~2/min

### 3.2 Adopt Shallow Snapshots

**File**: `packages/api/.../loro-doc-registry.ts`

**Current**: `doc.export({ mode: "snapshot" })` — full history every time.

**Change**: Use `doc.export({ mode: "shallow-snapshot", frontiers: ... })` for periodic saves. Keep only the last N minutes of history (e.g., last 30 min). Use full snapshot only on first save.

Benefits:
- Significantly smaller DB payloads (history grows unbounded without this)
- Faster load times on initial snapshot import
- Loro docs recommend this for production: "shallow snapshots work like Git shallow clone"

### 3.3 Doc Eviction (LRU Cache)

**File**: `packages/api/.../loro-doc-registry.ts`

**Current**: Docs live forever in `this.docs` Map.

**Change**: Add LRU eviction:
- Track last activity time per doc
- After all connections disconnect, start a TTL timer (e.g., 5 min)
- If no new connections in that window, persist snapshot + evict from memory
- Next connection will re-create doc from DB snapshot
- Add max doc count limit (e.g., 100 docs in memory) with LRU eviction

### 3.4 Evaluate loro-websocket / loro-adaptors Adoption

**Research only (no code change yet)**:

Evaluate whether to adopt the official `loro-websocket` + `loro-adaptors` packages:
- **Pros**: Reconnection, heartbeat, fragmentation (256 KiB limit), Ack protocol, room management, `SimpleServer` with persistence hooks, `%LOR` protocol standard
- **Cons**: Replaces our custom Elysia WS controller, adds dependency, different auth model
- **Verdict**: Document findings. If we adopt, it replaces `collab-ws.controller.ts` + `loro-doc-registry.ts` + client `collab.ts` entirely.

**Key question**: Can `loro-websocket` coexist with Elysia's WS handling, or does it need its own WS server?

---

## Phase 4: Advanced Loro Features

### 4.1 Import Status Handling

**File**: `packages/api/.../loro-doc-registry.ts` (server), `apps/web/src/features/board/collab.ts` (client)

**Change**: Check `import()` return value:
```typescript
const result = doc.import(payload);
if (result.pending && Object.keys(result.pending).length > 0) {
  // Log warning: some operations depend on missing prerequisites
  log.warn("Pending imports", { boardId, pending: result.pending });
}
```

### 4.2 Explicit Peer IDs

**File**: `apps/web/src/features/board/collab.ts` (client), `packages/api/.../loro-doc-registry.ts` (server)

**Current**: Random peer IDs per `LoroDoc` instance.

**Change**: 
- Server: `doc.setPeerId(0)` — deterministic, server is a single authority
- Client: Keep random (Loro default) — correct behavior per Loro docs
- Benefit: Server peer ID is deterministic for debugging. Version vectors become more readable.

### 4.3 Ephemeral Store for Awareness/Cursors (Future)

**Research only**: Evaluate `EphemeralStore` for cursor tracking and presence:
- Loro provides built-in `EphemeralStore` with timestamp-based LWW
- Wire protocol already has `0x01` message type reserved for ephemeral
- Would require Excalidraw integration for cursor rendering
- Defer to future feature request

### 4.4 Undo/Redo Support

**Research only**: Evaluate `UndoManager`:
- Loro provides `UndoManager` for local undo of user's own edits
- Could integrate with Excalidraw's built-in undo/redo
- Need to decide: CRDT-level undo vs application-level undo

---

## Files to Modify

### Phase 1 — Error Handling & Reconnection
| File | Change |
|---|---|
| `apps/web/src/features/board/collab.ts` | Add reconnection with exponential backoff, version vector exchange, connection state machine |
| `apps/web/src/features/board/excalidraw-wrapper.tsx` | Add error boundary, show connection state details |
| `apps/web/src/routes/board.$boardId.tsx` | Handle connection state from useCollab in UI |
| `packages/api/.../loro-doc-registry.ts` | Structured error logging, check import status, rate limiting, message size limits |
| `packages/api/.../collab-ws.controller.ts` | Add ping/pong heartbeat, meaningful close codes |
| `packages/api/.../loro-doc-registry.test.ts` | Update tests for new error handling |

### Phase 2 — Low Latency
| File | Change |
|---|---|
| `apps/web/src/features/board/collab.ts` | Batch updates before WS send (16ms debounce) |
| `apps/web/src/features/board/loro-excalidraw-binding.ts` | Optimize element diffing, consider event-based approach |
| `packages/api/.../loro-doc-registry.ts` | Remove dead `subscribeLocalUpdates`, support version vector exchange |

### Phase 3 — Server Efficiency
| File | Change |
|---|---|
| `packages/api/.../loro-doc-registry.ts` | Remove redundant persist, shallow snapshots, LRU eviction |
| `packages/api/.../loro-doc-registry.test.ts` | Update eviction tests |

### Phase 4 — Advanced
| File | Change |
|---|---|
| `packages/api/.../loro-doc-registry.ts` | Check import status, set server peer ID |
| `apps/web/src/features/board/collab.ts` | Set client peer ID (optional), check import status |

## Reuse

- **`evlog`**: Already integrated in the server — use for structured error logging in `loro-doc-registry.ts`
- **`ILoroDocRegistry` port**: All changes stay behind the existing port interface — no breaking changes to `CollabService`
- **`WSConn` interface**: Heartbeat tracking can extend this without breaking existing code
- **`useCollab` hook API**: Extend return type to include connection state — backwards compatible (additive)
- **Existing tests**: `loro-doc-registry.test.ts` patterns (fake conn, in-memory snapshot repo) are reusable for new tests

## Steps

### Phase 1: Error Handling & Reconnection
- [ ] 1.1 Add connection state enum to `useCollab` return type
- [ ] 1.2 Implement exponential backoff reconnection in `collab.ts`
- [ ] 1.3 Add `navigator.onLine` awareness to pause/resume reconnect
- [ ] 1.4 Add React error boundary around Excalidraw
- [ ] 1.5 Replace `catch {}` in `loro-doc-registry.ts` with evlog structured logging
- [ ] 1.6 Check `import()` return value for pending operations
- [ ] 1.7 Add meaningful WS close codes (4403, 4000, 1000)
- [ ] 1.8 Add ping/pong heartbeat in WS controller (30s interval)
- [ ] 1.9 Add rate limiting and message size limits to `handleMessage`
- [ ] 1.10 Update `loro-doc-registry.test.ts` for new behaviors

### Phase 2: Low Latency Optimization
- [ ] 2.1 Implement update batching in `collab.ts` (16ms / 16 KiB thresholds)
- [ ] 2.2 Add version vector exchange on WS connect (new message type `0x02`)
- [ ] 2.3 Server: support incremental sync on connect using `export({ mode: "update", from: clientVV })`
- [ ] 2.4 Remove dead `subscribeLocalUpdates` from `LoroSharedDoc` constructor
- [ ] 2.5 Research: optimize `applyElementDiff` with event-based or delta-based approach

### Phase 3: Server Efficiency
- [ ] 3.1 Remove `persistSnapshot()` call from `handleMessage()` — only persist on disconnect + timer
- [ ] 3.2 Increase timer interval from 5s to 30s
- [ ] 3.3 Implement shallow snapshot for periodic saves (`mode: "shallow-snapshot"`)
- [ ] 3.4 Add LRU doc eviction with TTL (5 min after last disconnect)
- [ ] 3.5 Add max doc count limit (100 concurrent)
- [ ] 3.6 Research: evaluate `loro-websocket` + `loro-adaptors` adoption

### Phase 4: Advanced Loro Features
- [ ] 4.1 Set explicit server peer ID (`doc.setPeerId(0)`)
- [ ] 4.2 Check `import()` return value on both client and server
- [ ] 4.3 Research: `EphemeralStore` for awareness/cursors
- [ ] 4.4 Research: `UndoManager` integration with Excalidraw

## Verification

### Per-Phase Testing
1. **Phase 1**: 
   - Kill server mid-edit → client shows "reconnecting" → restart server → client reconnects and syncs
   - Send invalid Loro payload → server logs error, doesn't crash
   - Disconnect network → reconnect → state is intact
   - Open board in 2 tabs, kill server, restart → both tabs reconnect and stay in sync

2. **Phase 2**:
   - Draw rapidly → verify updates are batched (fewer WS messages)
   - Measure round-trip time before/after batching
   - Reconnect after brief disconnect → verify incremental sync (smaller payload than full snapshot)

3. **Phase 3**:
   - Monitor DB write frequency during active editing → should be ~2/min, not ~200/min
   - Check snapshot sizes: shallow snapshots should be smaller than full snapshots
   - Connect to 100+ boards → verify eviction works, memory stays bounded

4. **Phase 4**:
   - Check version vector logs show clean peer IDs
   - Verify pending import warnings appear when expected

### E2E Tests (Playwright — `apps/e2e/`)

Existing E2E infrastructure: Playwright with POM pattern (`BoardEditorPage`, `BoardsPage`, `LoginPage`), helpers for auth/board creation, and existing collab + reload-persist tests.

**New E2E test file: `apps/e2e/tests/collab-reconnect.test.ts`**
- [ ] E2E-1: **Server restart reconnect** — open board → draw rectangle → kill API server → verify "reconnecting" state visible → restart server → verify "connected" state returns → rectangle still visible on canvas
- [ ] E2E-2: **Network disconnect reconnect** — open board → use Playwright `page.context().setOffline(true)` → verify "reconnecting" → restore online → verify "connected" → state intact
- [ ] E2E-3: **Multi-tab reconnect** — open board in 2 tabs → kill server → restart → both tabs reconnect and stay in sync
- [ ] E2E-4: **Draw after reconnect** — open board → draw → kill server → restart → wait for reconnect → draw again → verify both elements visible

**New E2E test file: `apps/e2e/tests/collab-error-handling.test.ts`**
- [ ] E2E-5: **Error boundary recovery** — simulate Excalidraw crash (if possible) → verify error UI shown → click retry → canvas recovers
- [ ] E2E-6: **Invalid board ID** — navigate to `/board/non-existent-id` → verify error state shown (not crash)
- [ ] E2E-7: **Auth expiration during collab** — open board → clear auth cookies → verify graceful handling (redirect or error, not infinite loop)

**Extend existing: `apps/e2e/tests/collab.test.ts`**
- [ ] E2E-8: **Rapid drawing sync** — draw 5 rectangles rapidly on page A → verify all 5 appear on page B within timeout
- [ ] E2E-9: **Version vector reconnect** — open board → draw → close tab → reopen same board → verify drawing loads (tests incremental sync)

**POM updates needed: `apps/e2e/pages/board-editor.page.ts`**
- [ ] Add `expectReconnecting()` — checks for "reconnecting" or "connecting" indicator
- [ ] Add `expectDisconnected()` — checks for disconnected state
- [ ] Add `waitForReconnect()` — polls for "Connected" after a disconnect

### Unit / Integration Tests
- `bun test --filter=loro-doc-registry` — all pass after changes
- `bun test --filter=collab.service` — all pass
- `turbo check-types` — zero type errors
- `turbo build` — clean build
