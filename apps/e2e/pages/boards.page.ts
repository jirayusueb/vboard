import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class BoardsPage extends BasePage {
  async expectVisible() {
    await expect(
      this.page.getByRole("heading", { name: "My Boards" }),
    ).toBeVisible();
  }

  async createBoard(
    title: string,
    visibility?: "public" | "private",
  ): Promise<string> {
    await this.goto("/board");
    await this.expectVisible();

    // Open the create dialog
    await this.page.getByRole("button", { name: "New Board" }).click();
    const dialog = this.page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    // Fill the form
    await dialog.getByLabel("Title").fill(title);
    if (visibility) {
      await this.selectVisibility(visibility);
    }
    await dialog.getByRole("button", { name: "Create" }).click();

    // Dialog should close, board card should appear
    await expect(dialog).not.toBeVisible();
    await expect(this.page.getByRole("link", { name: title })).toBeVisible();

    const href = await this.page
      .getByRole("link", { name: title })
      .getAttribute("href");
    return new URL(href!, "http://localhost:3001").href;
  }

  async expectBoardVisible(title: string) {
    await expect(
      this.page.getByRole("link", { name: title }),
    ).toBeVisible();
  }

  async expectEmptyState() {
    await expect(
      this.page.getByText("No boards yet"),
    ).toBeVisible();
    await expect(
      this.page.getByText("Create one to get started!"),
    ).toBeVisible();
  }

  /**
   * Select a visibility option inside the create-board dialog.
   * Must be called while the dialog is open.
   */
  async selectVisibility(visibility: "public" | "private") {
    const dialog = this.page.locator('[data-slot="dialog-content"]');
    await dialog.getByRole("combobox").click();
    await this.page
      .getByRole("option", { name: visibility.charAt(0).toUpperCase() + visibility.slice(1) })
      .click();
  }
}
