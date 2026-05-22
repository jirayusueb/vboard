import { test, expect } from "../fixtures";
import { signUpUser } from "../helpers/user";
import { loginAdmin } from "../helpers/auth";
import { waitForApiServer } from "../helpers/api";
import { BoardsPage } from "../pages/boards.page";
import { BoardEditorPage } from "../pages/board-editor.page";

test.describe("board CRUD", () => {
  test("board list shows empty state for a brand-new user", async ({
    browser,
  }) => {
    await waitForApiServer();

    const ctx = await browser.newContext();
    const timestamp = Date.now();

    // Sign up a fresh user — stores session in the context
    await signUpUser(
      ctx,
      `Fresh User ${timestamp}`,
      `fresh-${timestamp}@example.com`,
      "P@ssw0rd!",
    );

    // Create a new page in the SAME context (shares cookies)
    const page = await ctx.newPage();
    await page.goto("/board");
    await page.waitForLoadState("networkidle");

    // Use the page-specific BoardsPage instance (not the fixture)
    const boardsPage = new BoardsPage(page);
    await boardsPage.expectVisible();
    await boardsPage.expectEmptyState();

    await ctx.close();
  });

  test("create board with private visibility (default)", async ({
    loginPage,
    boardsPage,
    boardEditorPage,
    page,
  }) => {
    // Sign in first — board creation requires auth
    await loginPage.signIn("admin@example.com", "P@ssw0rd");

    const title = `Private Board ${Date.now()}`;
    const boardUrl = await boardsPage.createBoard(title);

    // Navigate to the board editor
    await page.goto(boardUrl, { waitUntil: "networkidle" });

    await boardEditorPage.expectBoardTitle(title);
    await boardEditorPage.expectVisibilityBadge("private");
  });

  test("create board with public visibility", async ({
    loginPage,
    boardsPage,
    boardEditorPage,
    page,
  }) => {
    // Sign in first — board creation requires auth
    await loginPage.signIn("admin@example.com", "P@ssw0rd");

    const title = `Public Board ${Date.now()}`;
    const boardUrl = await boardsPage.createBoard(title, "public");

    // Navigate to the board editor
    await page.goto(boardUrl, { waitUntil: "networkidle" });

    await boardEditorPage.expectBoardTitle(title);
    await boardEditorPage.expectVisibilityBadge("public");
  });
});
