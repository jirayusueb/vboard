import { test, expect } from "../fixtures";

test.describe("auth", () => {
  test("sign-up creates a new account and redirects to dashboard", async ({
    loginPage,
    dashboardPage,
  }) => {
    const timestamp = Date.now();
    await loginPage.signUp(
      `E2E User ${timestamp}`,
      `e2e-${timestamp}@example.com`,
      "P@ssw0rd!",
    );

    await dashboardPage.expectVisible();
  });

  test("sign-up shows validation error for short password on submit", async ({
    loginPage,
  }) => {
    await loginPage.goto("/login");

    await loginPage.page.getByLabel("Name").fill("Too Short");
    await loginPage.page.getByLabel("Email").fill("short@example.com");
    await loginPage.page.getByLabel("Password").fill("123"); // too short

    // TanStack Form validates on submit — click the button
    await loginPage.page.getByRole("button", { name: "Sign Up" }).click();

    // Inline validation error should appear below the password field
    await loginPage.expectPasswordValidationError(
      "Password must be at least 8 characters",
    );
  });

  test("sign-in with correct credentials redirects to dashboard", async ({
    loginPage,
    dashboardPage,
  }) => {
    await loginPage.signIn("admin@example.com", "P@ssw0rd");
    await dashboardPage.expectVisible();
  });

  test("sign-out navigates away from dashboard", async ({
    loginPage,
    headerPage,
    page,
  }) => {
    // Sign in first
    await loginPage.signIn("admin@example.com", "P@ssw0rd");

    // Navigate to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Sign out via the user menu
    await headerPage.signOut();

    // Should be redirected to home
    await expect(page).toHaveURL(/\//);

    // Header should show "Sign In" button
    await headerPage.expectSignInButton();
  });

  test("unauthenticated user is redirected to /login from /dashboard", async ({
    page,
  }) => {
    // Go directly to dashboard without being logged in
    await page.goto("/dashboard");

    // Should be redirected to /login
    await expect(page).toHaveURL(/\/login/);
  });
});
