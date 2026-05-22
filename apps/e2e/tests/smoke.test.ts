import { test, expect } from "../fixtures";

test.describe("smoke: login → new board → board renders", () => {
  test("admin can login, create a board, and see the Excalidraw canvas", async ({
    loginPage,
    boardsPage,
    boardEditorPage,
    page,
  }) => {
    // ── 1. Login ─────────────────────────────────────────────────────────
    await loginPage.signIn("admin@example.com", "P@ssw0rd");

    // ── 2. Create a new board ──────────────────────────────────────────
    const boardTitle = `Smoke Test ${Date.now()}`;
    const boardUrl = await boardsPage.createBoard(boardTitle);

    // ── 3. Navigate to board and verify Excalidraw renders ──────────────
    await page.goto(boardUrl, { waitUntil: "networkidle" });
    await boardEditorPage.expectNotBoardsList();
    await boardEditorPage.expectCanvasVisible();
  });
});
