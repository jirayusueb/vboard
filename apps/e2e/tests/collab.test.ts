import { test, expect } from "../fixtures";
import { waitForApiServer } from "../helpers/api";
import { loginAdmin } from "../helpers/auth";
import { BoardsPage } from "../pages/boards.page";
import { BoardEditorPage } from "../pages/board-editor.page";

test.describe("collab: real-time sync between two peers", () => {
  test("two pages connected to the same board both show Connected status", async ({
    browser,
  }) => {
    await waitForApiServer();

    const adminCtx = await browser.newContext();
    await loginAdmin(adminCtx);

    // Create a board via a throwaway page
    const createPage = await adminCtx.newPage();
    const boardsPage = new BoardsPage(createPage);
    const boardUrl = await boardsPage.createBoard(
      `Collab Test ${Date.now()}`,
    );
    await createPage.close();

    // Open two pages to the same board
    const pageA = await adminCtx.newPage();
    const pageB = await adminCtx.newPage();
    const editorA = new BoardEditorPage(pageA);
    const editorB = new BoardEditorPage(pageB);

    await pageA.goto(boardUrl, { waitUntil: "networkidle" });
    await pageB.goto(boardUrl, { waitUntil: "networkidle" });

    // Both should render Excalidraw canvas
    await editorA.expectCanvasVisible();
    await editorB.expectCanvasVisible();

    // Both should show "Connected" via WebSocket
    await editorA.expectConnected();
    await editorB.expectConnected();

    // Both should have green indicator dots
    await editorA.expectConnectedIndicator();
    await editorB.expectConnectedIndicator();

    await adminCtx.close();
  });

  test("element drawn on page A appears on page B", async ({ browser }) => {
    await waitForApiServer();

    const adminCtx = await browser.newContext();
    await loginAdmin(adminCtx);

    // Create a board via a throwaway page
    const createPage = await adminCtx.newPage();
    const boardsPage = new BoardsPage(createPage);
    const boardUrl = await boardsPage.createBoard(
      `Collab Test ${Date.now()}`,
    );
    await createPage.close();

    const pageA = await adminCtx.newPage();
    const pageB = await adminCtx.newPage();
    const editorA = new BoardEditorPage(pageA);
    const editorB = new BoardEditorPage(pageB);

    await pageA.goto(boardUrl, { waitUntil: "networkidle" });
    await pageB.goto(boardUrl, { waitUntil: "networkidle" });

    // Wait for canvases and WebSocket connections
    await editorA.expectCanvasVisible();
    await editorB.expectCanvasVisible();
    await editorA.expectConnected();
    await editorB.expectConnected();

    // Page A: draw a rectangle
    await editorA.drawRectangle();

    // Page B: rectangle should appear via Loro CRDT sync
    await editorB.expectRectangleVisible();

    await adminCtx.close();
  });
});
