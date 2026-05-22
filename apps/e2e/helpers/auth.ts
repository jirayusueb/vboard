import type { BrowserContext } from "@playwright/test";
import { expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";

/** Signs in as admin and stores session cookies in the browser context. */
export async function loginAdmin(context: BrowserContext) {
  const page = await context.newPage();
  const login = new LoginPage(page);
  await login.signIn("admin@example.com", "P@ssw0rd");
  await page.close();
}
