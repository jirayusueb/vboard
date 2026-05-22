import type { BrowserContext } from "@playwright/test";

/**
 * Signs up a brand-new user and stores the session in the browser context.
 * Returns after the sign-up completes (page is closed).
 */
export async function signUpUser(
  context: BrowserContext,
  name: string,
  email: string,
  password: string,
) {
  const page = await context.newPage();

  // /login defaults to the sign-up form
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  // Submit the sign-up form
  await page.getByRole("button", { name: "Sign Up" }).click();

  // Wait for redirect to dashboard (sign-up navigates on success)
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  await page.close();
}
