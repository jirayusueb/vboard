import { test, expect } from "../fixtures";
import { waitForApiServer } from "../helpers/api";
import { loginAdmin } from "../helpers/auth";
import { signUpUser } from "../helpers/user";
import { createInviteViaApi } from "../helpers/invite";
import { BoardsPage } from "../pages/boards.page";
import { BoardEditorPage } from "../pages/board-editor.page";
import { LoginPage } from "../pages/login.page";

test.describe("invite claim", () => {
  test("invalid invite token shows error page", async ({
    loginPage,
    page,
  }) => {
    // Sign in first (invite claim page requires auth)
    await loginPage.signIn("admin@example.com", "P@ssw0rd");

    // Navigate to a bogus invite token
    await page.goto("/board/invite/invalid-token-123", {
      waitUntil: "networkidle",
    });

    // Should show error UI
    await expect(
      page.getByRole("heading", { name: "Invite Error" }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("← Back to boards")).toBeVisible();
  });

  test("claiming a valid invite redirects to board editor", async ({
    browser,
  }) => {
    await waitForApiServer();

    // ── Setup: admin creates a board and an invite ────────────────────
    const adminCtx = await browser.newContext();
    await loginAdmin(adminCtx);

    const createPage = await adminCtx.newPage();
    const boardsPage = new BoardsPage(createPage);
    const boardTitle = `Invite Test ${Date.now()}`;
    const boardUrl = await boardsPage.createBoard(boardTitle);

    // Extract boardId from the URL
    const boardUrlObj = new URL(boardUrl);
    const boardId = boardUrlObj.pathname.split("/").pop()!;

    // Create an invite via the API (no UI for this)
    const cookies = (await adminCtx.cookies())
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const { token } = await createInviteViaApi(cookies, boardId, "editor");
    await createPage.close();

    // ── Claim: second user signs up then opens the invite link ────────
    const timestamp = Date.now();
    const secondCtx = await browser.newContext();

    // Sign up the second user first so they have a session
    await signUpUser(
      secondCtx,
      `Invite User ${timestamp}`,
      `invite-${timestamp}@example.com`,
      "P@ssw0rd!",
    );

    // Now navigate to the invite link
    const secondPage = await secondCtx.newPage();
    await secondPage.goto(`/board/invite/${token}`, {
      waitUntil: "networkidle",
    });

    // Should be redirected to the board editor
    const editor = new BoardEditorPage(secondPage);
    await expect(secondPage).toHaveURL(/\/board\/.+/, { timeout: 15_000 });
    await editor.expectCanvasVisible();

    await adminCtx.close();
    await secondCtx.close();
  });
});
