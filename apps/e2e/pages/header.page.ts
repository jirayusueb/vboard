import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Component object for the shared site header.
 * Wraps navigation links and the user-menu dropdown.
 */
export class HeaderPage {
  constructor(private readonly page: Page) {}

  // ── Navigation ──────────────────────────────────────────────────────

  async navigateToHome() {
    await this.page.getByRole("link", { name: "Home" }).click();
    await this.page.waitForLoadState("networkidle");
  }

  async navigateToDashboard() {
    await this.page.getByRole("link", { name: "Dashboard" }).click();
    await this.page.waitForLoadState("networkidle");
  }

  async navigateToBoards() {
    await this.page.getByRole("link", { name: "Boards" }).click();
    await this.page.waitForLoadState("networkidle");
  }

  // ── Assertions ──────────────────────────────────────────────────────

  async expectSignInButton() {
    await expect(
      this.page.getByRole("link", { name: "Sign In" }),
    ).toBeVisible();
  }

  async expectUserMenu(name: string) {
    await expect(
      this.page.getByRole("button", { name }),
    ).toBeVisible();
  }

  // ── Actions ─────────────────────────────────────────────────────────

  async signOut() {
    // Open the user-menu dropdown trigger (not the DevTools button)
    // Use the specific dropdown-menu trigger button
    const trigger = this.page.locator(
      '[data-slot="dropdown-menu-trigger"]',
    );
    await trigger.click();

    await expect(
      this.page.getByRole("menuitem", { name: "Sign Out" }),
    ).toBeVisible();
    await this.page.getByRole("menuitem", { name: "Sign Out" }).click();
    await this.page.waitForLoadState("networkidle");
  }
}
