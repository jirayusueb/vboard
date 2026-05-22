import { expect } from "@playwright/test";
import { BasePage } from "./base.page";
import { DashboardPage } from "./dashboard.page";

export class LoginPage extends BasePage {
  async signIn(
    email: string,
    password: string,
  ): Promise<DashboardPage> {
    await this.goto("/login");

    // Login page defaults to the sign-up form — switch to sign-in
    await this.page
      .getByRole("button", { name: "Already have an account? Sign In" })
      .click();

    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Sign In" }).nth(1).click();

    const dashboard = new DashboardPage(this.page);
    await dashboard.expectVisible();
    return dashboard;
  }

  async signUp(
    name: string,
    email: string,
    password: string,
  ): Promise<DashboardPage> {
    // /login defaults to the sign-up form — no toggle needed
    await this.goto("/login");

    await this.page.getByLabel("Name").fill(name);
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Sign Up" }).click();

    const dashboard = new DashboardPage(this.page);
    await dashboard.expectVisible();
    return dashboard;
  }

  async expectPasswordValidationError(message?: string) {
    // Sign-up form shows inline validation errors below the password field
    const error = this.page.locator("p.text-red-500");
    if (message) {
      await expect(error).toContainText(message);
    } else {
      await expect(error.first()).toBeVisible();
    }
  }
}
