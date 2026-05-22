import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class BoardEditorPage extends BasePage {
  async expectCanvasVisible() {
    await expect(this.page.locator("canvas").first()).toBeVisible({
      timeout: 30_000,
    });
  }

  async expectConnected() {
    await expect(this.page.getByText("Connected")).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectConnectedIndicator() {
    await expect(this.page.locator(".bg-green-500").first()).toBeVisible();
  }

  async expectNotBoardsList() {
    await expect(
      this.page.getByRole("heading", { name: "My Boards" }),
    ).not.toBeVisible();
  }

  async drawRectangle() {
    // Select rectangle tool
    await this.page.getByTestId("toolbar-rectangle").click({ force: true });

    const canvas = this.page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas bounding box not found");

    const x = box.x + box.width / 2 - 50;
    const y = box.y + box.height / 2 - 50;
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + 100, y + 100, { steps: 10 });
    await this.page.mouse.up();
  }

  async expectRectangleVisible() {
    // Excalidraw renders on <canvas>. Poll getSceneElements() via the
    // imperative API exposed on window.__excalidrawAPI.
    await expect(async () => {
      const count = await this.page.evaluate(() => {
        const api = (window as Record<string, unknown>).__excalidrawAPI as
          | { getSceneElements: () => { isDeleted: boolean }[] }
          | undefined;
        if (!api) throw new Error("API not ready");
        const els = api.getSceneElements();
        // Count non-deleted elements
        return els.filter((e) => !e.isDeleted).length;
      });
      if (count === 0) {
        throw new Error(`Expected scene elements but got 0`);
      }
    }).toPass({ timeout: 10_000 });
  }

  // ── Connection state assertions ────────────────────────────────

  async expectReconnecting() {
    // Checks for "Reconnecting..." or "Connecting..." text
    await expect(
      this.page.getByText(/Reconnecting\.\.\.|Connecting\.\.\./),
    ).toBeVisible({ timeout: 10_000 });
  }

  async expectDisconnected() {
    await expect(
      this.page.getByText("Disconnected"),
    ).toBeVisible({ timeout: 10_000 });
  }

  /** Poll until "Connected" appears after a disconnect event. */
  async waitForReconnect(timeout = 30_000) {
    await expect(this.page.getByText("Connected")).toBeVisible({
      timeout,
    });
  }

  /** Expect a specific number of non-deleted elements on the canvas. */
  async expectElementCount(count: number, timeout = 10_000) {
    await expect(async () => {
      const actual = await this.page.evaluate(() => {
        const api = (window as Record<string, unknown>).__excalidrawAPI as
          | { getSceneElements: () => { isDeleted: boolean }[] }
          | undefined;
        if (!api) throw new Error("API not ready");
        return api.getSceneElements().filter((e) => !e.isDeleted).length;
      });
      if (actual !== count) {
        throw new Error(`Expected ${count} elements but got ${actual}`);
      }
    }).toPass({ timeout });
  }

  // ── Title bar assertions ──────────────────────────────────────────

  async expectBoardTitle(title: string) {
    await expect(
      this.page.getByText(title, { exact: false }),
    ).toBeVisible();
  }

  async expectVisibilityBadge(visibility: "public" | "private") {
    // The Badge component renders as a <span data-slot="badge">
    await expect(
      this.page.locator('[data-slot="badge"]').filter({ hasText: visibility }),
    ).toBeVisible();
  }

  async expectReadOnlyBadge() {
    await expect(
      this.page.locator(".text-orange-500").first(),
    ).toBeVisible();
  }
}
