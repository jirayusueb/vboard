# Plan: Expand E2E Test Coverage

## Context

The project currently has 3 E2E tests (1 smoke, 2 collab) covering a narrow slice of the application. The app has many more user-facing features — sign-up, board CRUD (update/delete), visibility toggling, invite/claim flow, member management, ownership transfer, sign-out, and dashboard navigation — none of which are tested end-to-end.

**Goal**: Design and implement a comprehensive E2E test suite that covers all major user flows, reusing the existing POM structure (`apps/e2e/`).

## Current Coverage

| Flow | Status |
|---|---|
| Login (sign-in) | ✅ Covered (smoke test) |
| Create board | ✅ Covered (smoke test) |
| Excalidraw canvas renders | ✅ Covered (smoke test) |
| Two peers connect + sync | ✅ Covered (collab test) |
| Drawing syncs across peers | ✅ Covered (collab test) |
| Sign-up (create account) | ❌ Not tested |
| Sign-out | ❌ Not tested |
| Dashboard navigation | ❌ Not tested |
| Board list (empty state) | ❌ Not tested |
| Board visibility (public/private) | ❌ Not tested |
| Update board (title/visibility) | ❌ Not tested |
| Delete board | ❌ Not tested |
| Create invite link | ❌ Not tested |
| Claim invite (as second user) | ❌ Not tested |
| Remove member | ❌ Not tested |
| Transfer ownership | ❌ Not tested |
| Unauthorized access to board | ❌ Not tested |
| Invalid invite token | ❌ Not tested |

## Approach

Group tests by feature domain in separate files. Each file uses the existing POM fixtures and helpers. Add new page-object methods and helpers as needed (no structural changes to the POM — just extend existing classes).

### New Test Files

| File | Tests |
|---|---|
| `tests/auth.test.ts` | Sign-up, sign-in, sign-out, session persistence |
| `tests/board-crud.test.ts` | Create, update title, toggle visibility, delete board |
| `tests/invite.test.ts` | Create invite, claim invite as second user, invalid token, already-member |
| `tests/navigation.test.ts` | Dashboard renders, header nav links, redirect when unauthenticated |

### Existing Files (no changes needed)

| File | Tests |
|---|---|
| `tests/smoke.test.ts` | Login → create board → canvas renders |
| `tests/collab.test.ts` | Two-peer sync, drawing propagation |

## Test Cases

### 1. `auth.test.ts` — Authentication Flows

```ts
test.describe("auth")
  test("sign-up creates a new account and redirects to dashboard")
    // 1. Go to /login (defaults to sign-up form)
    // 2. Fill name, email, password
    // 3. Submit
    // 4. Assert redirected to /dashboard

  test("sign-up validates minimum password length")
    // 1. Go to /login
    // 2. Fill name, email, short password (< 8 chars)
    // 3. Assert inline error: "Password must be at least 8 characters"

  test("sign-out navigates away from dashboard")
    // 1. Login as admin
    // 2. Navigate to /dashboard
    // 3. Click user menu → sign out
    // 4. Assert navigated to /
    // 5. Assert "Sign In" button visible in header

  test("unauthenticated user is redirected to /login")
    // 1. Go directly to /dashboard
    // 2. Assert redirected to /login

  test("sign-in with correct credentials redirects to dashboard")
    // Already tested in smoke, but explicit here
    // 1. Switch to sign-in form
    // 2. Fill admin credentials
    // 3. Submit
    // 4. Assert /dashboard
```

### 2. `board-crud.test.ts` — Board Management

```ts
test.describe("board CRUD")
  test("board list shows empty state when no boards")
    // Use a freshly signed-up user (no boards)
    // 1. Sign up as new user
    // 2. Navigate to /board
    // 3. Assert "No boards yet" empty state visible

  test("create board with private visibility (default)")
    // 1. Login
    // 2. Create board with default visibility
    // 3. Navigate to board editor
    // 4. Assert badge shows "private"

  test("create board with public visibility")
    // 1. Login
    // 2. Click "New Board"
    // 3. Select "public" from visibility dropdown
    // 4. Create
    // 5. Navigate to board editor
    // 6. Assert badge shows "public"

  test("board card links to board editor")
    // Already covered in smoke indirectly

  // NOTE: update, delete are backend-only — no frontend UI to test
```

### 3. `invite.test.ts` — Invite Claim (Frontend Only)

> Note: Invite *creation* is backend-only (no UI). These tests cover only the claim flow.
> To generate invite tokens, tests call the API directly via `fetch()`.

```ts
test.describe("invite claim")
  test("claiming a valid invite redirects to board editor")
    // 1. Login as admin
    // 2. Create board
    // 3. Create invite via API: POST /board/:id/invite { role: "member" }
    // 4. Open /board/invite/{token} in a new browser context
    // 5. Sign in / sign up as a second user
    // 6. Assert redirected to /board/{boardId}
    // 7. Assert canvas visible

  test("invalid invite token shows error")
    // 1. Go to /board/invite/invalid-token-123
    // 2. Sign in
    // 3. Assert error heading "Invite Error" visible
    // 4. Assert error message text present
    // 5. Assert "Back to boards" link visible

  test("claiming invite when not authenticated prompts login")
    // 1. Go to /board/invite/{valid-token} without being logged in
    // 2. Assert redirected to /login (or auth guard triggers)
    // NOTE: verify if the claim page has auth guard or claims on load
```

### 4. `navigation.test.ts` — Navigation & Guards

```ts
test.describe("navigation")
  test("dashboard shows user name")
    // 1. Login
    // 2. Navigate to /dashboard
    // 3. Assert "Welcome <name>" text

  test("header nav links work")
    // 1. Login
    // 2. Click "Boards" in header
    // 3. Assert /board route

  test("logged-out user sees sign-in button in header")
    // 1. Go to /
    // 2. Assert "Sign In" button visible
```

## POM Extensions Needed

### `LoginPage`

| New Method | Purpose |
|---|---|
| `signUp(name, email, password)` | Fill sign-up form and submit |
| `expectErrorVisible()` | Assert error message shown after failed sign-in |

### `DashboardPage`

| New Method | Purpose |
|---|---|
| `expectWelcomeMessage(name)` | Assert "Welcome <name>" text |

### `BoardEditorPage`

| New Method | Purpose |
|---|---|
| `expectBoardTitle(title)` | Assert board title shown in title bar |
| `expectVisibilityBadge(visibility)` | Assert "public" or "private" badge |
| `expectReadOnlyBadge()` | Assert read-only badge shown for viewers |

### `BoardsPage`

| New Method | Purpose |
|---|---|
| `expectBoardVisible(title)` | Assert board card with given title exists |
| `expectEmptyState()` | Assert "No boards yet" empty state visible |
| `selectVisibility(visibility)` | Select visibility in create dialog |

### New: `HeaderPage` (component object)

| Method | Purpose |
|---|---|
| `expectSignInButton()` | Assert sign-in button visible (logged out) |
| `expectUserMenu(name)` | Assert user name in dropdown trigger |
| `signOut()` | Click sign-out from user menu |
| `navigateToBoards()` | Click "Boards" link |
| `navigateToDashboard()` | Click "Dashboard" link |

### New Helpers

| File | Function | Purpose |
|---|---|---|
| `helpers/user.ts` | `signUpUser(context, name, email, password)` | Create a new user account and store session |
| `helpers/invite.ts` | `createInviteViaApi(context, boardId, role)` | Create invite token via direct API call (no UI for this) |

## Files to Create

| File | Purpose |
|---|---|
| `apps/e2e/tests/auth.test.ts` | Auth flow tests (sign-up, sign-out, unauth redirect) |
| `apps/e2e/tests/board-crud.test.ts` | Board creation & visibility tests |
| `apps/e2e/tests/invite.test.ts` | Invite claim tests |
| `apps/e2e/tests/navigation.test.ts` | Navigation & guard tests |
| `apps/e2e/pages/header.page.ts` | Header component object |
| `apps/e2e/helpers/user.ts` | `signUpUser()` helper |
| `apps/e2e/helpers/invite.ts` | `createInviteViaApi()` helper |

## Files to Modify

| File | Change |
|---|---|
| `apps/e2e/pages/login.page.ts` | Add `signUp()`, `expectErrorVisible()` |
| `apps/e2e/pages/dashboard.page.ts` | Add `expectWelcomeMessage()` |
| `apps/e2e/pages/board-editor.page.ts` | Add `expectBoardTitle()`, `expectVisibilityBadge()`, `expectReadOnlyBadge()` |
| `apps/e2e/pages/boards.page.ts` | Add `expectBoardVisible()`, `expectEmptyState()`, `selectVisibility()` |
| `apps/e2e/fixtures/index.ts` | Register `headerPage` fixture |
| `apps/e2e/helpers/user.ts` | New helper for sign-up |

## Steps

- [ ] **Step 1**: Create `apps/e2e/pages/header.page.ts` — HeaderPage component object with nav, sign-in/sign-out methods
- [ ] **Step 2**: Create `apps/e2e/helpers/user.ts` — `signUpUser()` helper
- [ ] **Step 3**: Create `apps/e2e/helpers/invite.ts` — `createInviteViaApi()` helper (direct API call)
- [ ] **Step 4**: Extend `LoginPage` — add `signUp()` method
- [ ] **Step 5**: Extend `DashboardPage` — add `expectWelcomeMessage()`
- [ ] **Step 6**: Extend `BoardEditorPage` — add `expectBoardTitle()`, `expectVisibilityBadge()`
- [ ] **Step 7**: Extend `BoardsPage` — add `expectEmptyState()`, `selectVisibility()`
- [ ] **Step 8**: Register `headerPage` in fixtures
- [ ] **Step 9**: Write `tests/auth.test.ts`
- [ ] **Step 10**: Write `tests/navigation.test.ts`
- [ ] **Step 11**: Write `tests/board-crud.test.ts`
- [ ] **Step 12**: Write `tests/invite.test.ts`
- [ ] **Step 13**: Run full E2E suite and verify all tests pass

## Verification

```bash
# Prerequisites: postgres running (docker-compose up -d)
turbo test:e2e
```

Expected: original 3 tests still pass + ~10 new tests pass.

### Test count estimate
| File | Tests |
|---|---|
| `smoke.test.ts` | 1 (existing) |
| `collab.test.ts` | 2 (existing) |
| `auth.test.ts` | ~4 |
| `navigation.test.ts` | ~3 |
| `board-crud.test.ts` | ~3 |
| `invite.test.ts` | ~2 |
| **Total** | **~15** |

### Out of scope (backend-only, no UI)
- Update board title/visibility
- Delete board
- Create invite link
- Remove member
- Transfer ownership
- List members

These should be covered by API-level integration tests (existing unit tests cover the use cases, but HTTP-level integration tests would be a separate effort).

## Audit Results

| Feature | Frontend UI? | Notes |
|---|---|---|
| Sign-up | ✅ Yes | `/login` — has Name, Email, Password fields; errors as sonner toast |
| Sign-in | ✅ Yes | `/login` — toggle to sign-in form |
| Sign-out | ✅ Yes | User menu dropdown → "Sign Out" |
| Dashboard | ✅ Yes | `/dashboard` — shows "Welcome {name}" |
| Board list | ✅ Yes | `/board` — grid of cards + "New Board" button |
| Create board | ✅ Yes | Dialog with title + visibility selector |
| Board editor | ✅ Yes | `/board/$boardId` — Excalidraw canvas + title bar |
| Claim invite | ✅ Yes | `/board/invite/$token` — auto-claims on load |
| **Update board** | ❌ Backend only | PATCH `/board/:id` exists, no UI |
| **Delete board** | ❌ Backend only | DELETE `/board/:id` exists, no UI |
| **Create invite** | ❌ Backend only | POST `/board/:id/invite` exists, no UI |
| **Remove member** | ❌ Backend only | DELETE `/board/:id/members/:userId` exists, no UI |
| **Transfer ownership** | ❌ Backend only | POST `/board/:id/transfer` exists, no UI |

**Key finding**: Many features are backend-only with no frontend UI. E2E tests can only cover what has a UI. Update/delete/invite-creation/remove-member/transfer-ownership must be tested at the API level (unit/integration), not E2E.

**Error handling**: Auth errors display as sonner toast notifications (not inline text). Tests should assert on toast messages.

**Second user for invite tests**: Sign up a new user per test run with unique email (e.g. `e2e-invite-{timestamp}@example.com`). No seed fixture needed.
