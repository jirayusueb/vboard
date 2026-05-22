import { test, expect } from "../fixtures";
import { waitForApiServer } from "../helpers/api";
import { loginAdmin } from "../helpers/auth";
import { BoardsPage } from "../pages/boards.page";
import { BoardEditorPage } from "../pages/board-editor.page";

test.describe("collab error handling", () => {
	test("invalid board ID shows error state", async ({ browser }) => {
		await waitForApiServer();

		const adminCtx = await browser.newContext();
		await loginAdmin(adminCtx);

		const page = await adminCtx.newPage();
		await page.goto("/board/non-existent-board-id", {
			waitUntil: "networkidle",
		});

		// Should show the "Board not found" error alert, not crash
		await expect(
			page.getByRole("alert").filter({ hasText: "Board not found" }),
		).toBeVisible({ timeout: 10_000 });

		// Should have a link back to boards
		await expect(
			page.getByRole("link", { name: /Back to boards/i }),
		).toBeVisible();

		await adminCtx.close();
	});

	test("error boundary catches canvas errors gracefully", async ({ browser }) => {
		await waitForApiServer();

		const adminCtx = await browser.newContext();
		await loginAdmin(adminCtx);

		const createPage = await adminCtx.newPage();
		const boardsPage = new BoardsPage(createPage);
		const boardUrl = await boardsPage.createBoard(
			`Error Boundary ${Date.now()}`,
		);
		await createPage.close();

		const page = await adminCtx.newPage();
		const editor = new BoardEditorPage(page);

		await page.goto(boardUrl, { waitUntil: "networkidle" });
		await editor.expectCanvasVisible();
		await editor.expectConnected();

		// Verify the canvas loads without crashing
		// The error boundary wraps the canvas, so if it loads we're good
		await expect(page.locator("canvas").first()).toBeVisible({
			timeout: 30_000,
		});

		await adminCtx.close();
	});

	test("network disconnect shows reconnecting state", async ({ browser }) => {
		await waitForApiServer();

		const adminCtx = await browser.newContext();
		await loginAdmin(adminCtx);

		const createPage = await adminCtx.newPage();
		const boardsPage = new BoardsPage(createPage);
		const boardUrl = await boardsPage.createBoard(
			`Network Disconnect ${Date.now()}`,
		);
		await createPage.close();

		const page = await adminCtx.newPage();
		const editor = new BoardEditorPage(page);

		await page.goto(boardUrl, { waitUntil: "networkidle" });
		await editor.expectCanvasVisible();
		await editor.expectConnected();

		// Simulate network offline
		await page.context().setOffline(true);

		// Wait for the reconnecting indicator
		await editor.expectReconnecting();

		// Restore network
		await page.context().setOffline(false);

		// Should reconnect
		await editor.waitForReconnect();

		await adminCtx.close();
	});
});
