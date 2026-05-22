import { test, expect } from "../fixtures";
import { waitForApiServer } from "../helpers/api";
import { loginAdmin } from "../helpers/auth";
import { BoardsPage } from "../pages/boards.page";
import { BoardEditorPage } from "../pages/board-editor.page";

test.describe("Bug: Board empty after reload", () => {
	test("drawing persists across page reload", async ({ browser }) => {
		await waitForApiServer();

		const adminCtx = await browser.newContext();
		await loginAdmin(adminCtx);

		const createPage = await adminCtx.newPage();
		const boardsPage = new BoardsPage(createPage);
		const boardUrl = await boardsPage.createBoard(
			`Reload Persist ${Date.now()}`,
		);
		await createPage.close();

		const page = await adminCtx.newPage();
		const editor = new BoardEditorPage(page);

		await page.goto(boardUrl, { waitUntil: "networkidle" });
		await editor.expectCanvasVisible();
		await editor.expectConnected();

		await editor.drawRectangle();
		await editor.expectRectangleVisible();

		// Wait for server to persist snapshot (runs on every message + 5s timer)
		await page.waitForTimeout(1000);

		// Reload the page
		await page.reload({ waitUntil: "networkidle" });

		await editor.expectCanvasVisible();
		await editor.expectConnected();

		// Rectangle must still be present after reload
		await editor.expectRectangleVisible();

		await adminCtx.close();
	});
});
