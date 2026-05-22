import { test, expect } from "../fixtures";
import { waitForApiServer } from "../helpers/api";
import { loginAdmin } from "../helpers/auth";
import { BoardsPage } from "../pages/boards.page";
import { BoardEditorPage } from "../pages/board-editor.page";

test.describe("collab reconnect: real-time sync resilience", () => {
	test("element drawn on page A appears on page B", async ({ browser }) => {
		await waitForApiServer();

		const adminCtx = await browser.newContext();
		await loginAdmin(adminCtx);

		const createPage = await adminCtx.newPage();
		const boardsPage = new BoardsPage(createPage);
		const boardUrl = await boardsPage.createBoard(
			`Reconnect Test ${Date.now()}`,
		);
		await createPage.close();

		const pageA = await adminCtx.newPage();
		const pageB = await adminCtx.newPage();
		const editorA = new BoardEditorPage(pageA);
		const editorB = new BoardEditorPage(pageB);

		await pageA.goto(boardUrl, { waitUntil: "networkidle" });
		await pageB.goto(boardUrl, { waitUntil: "networkidle" });

		await editorA.expectCanvasVisible();
		await editorB.expectCanvasVisible();
		await editorA.expectConnected();
		await editorB.expectConnected();

		await editorA.drawRectangle();
		await editorB.expectRectangleVisible();

		await adminCtx.close();
	});

	test("rapid drawing sync: 5 rectangles on page A appear on page B", async ({
		browser,
	}) => {
		await waitForApiServer();

		const adminCtx = await browser.newContext();
		await loginAdmin(adminCtx);

		const createPage = await adminCtx.newPage();
		const boardsPage = new BoardsPage(createPage);
		const boardUrl = await boardsPage.createBoard(
			`Rapid Sync ${Date.now()}`,
		);
		await createPage.close();

		const pageA = await adminCtx.newPage();
		const pageB = await adminCtx.newPage();
		const editorA = new BoardEditorPage(pageA);
		const editorB = new BoardEditorPage(pageB);

		await pageA.goto(boardUrl, { waitUntil: "networkidle" });
		await pageB.goto(boardUrl, { waitUntil: "networkidle" });

		await editorA.expectCanvasVisible();
		await editorB.expectCanvasVisible();
		await editorA.expectConnected();
		await editorB.expectConnected();

		// Draw 5 rectangles rapidly
		for (let i = 0; i < 5; i++) {
			await editorA.drawRectangle();
		}

		// All 5 should appear on page B
		await editorB.expectElementCount(5, { timeout: 15_000 } as any);

		await adminCtx.close();
	});

	test("version vector reconnect: drawing persists across tab close and reopen", async ({
		browser,
	}) => {
		await waitForApiServer();

		const adminCtx = await browser.newContext();
		await loginAdmin(adminCtx);

		const createPage = await adminCtx.newPage();
		const boardsPage = new BoardsPage(createPage);
		const boardUrl = await boardsPage.createBoard(
			`VV Reconnect ${Date.now()}`,
		);
		await createPage.close();

		// Open board, draw, then close tab entirely
		const page1 = await adminCtx.newPage();
		const editor1 = new BoardEditorPage(page1);
		await page1.goto(boardUrl, { waitUntil: "networkidle" });
		await editor1.expectCanvasVisible();
		await editor1.expectConnected();
		await editor1.drawRectangle();
		await editor1.expectRectangleVisible();

		// Wait for server to persist
		await page1.waitForTimeout(2000);
		await page1.close();

		// Reopen board in a new tab
		const page2 = await adminCtx.newPage();
		const editor2 = new BoardEditorPage(page2);
		await page2.goto(boardUrl, { waitUntil: "networkidle" });
		await editor2.expectCanvasVisible();
		await editor2.expectConnected();

		// Rectangle should still be present (tests incremental sync on reconnect)
		await editor2.expectRectangleVisible();

		await adminCtx.close();
	});
});
