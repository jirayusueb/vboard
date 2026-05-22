import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class DashboardPage extends BasePage {
  async expectVisible() {
    await expect(this.page).toHaveURL(/\/dashboard/);
    await expect(
      this.page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  }

  async expectWelcomeMessage(name: string) {
    await expect(this.page.getByText(`Welcome ${name}`)).toBeVisible();
  }
}
