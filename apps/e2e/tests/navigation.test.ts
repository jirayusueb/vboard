import { test, expect } from "../fixtures";

test.describe("navigation", () => {
  test("dashboard shows welcome message with user name", async ({
    loginPage,
    dashboardPage,
  }) => {
    await loginPage.signIn("admin@example.com", "P@ssw0rd");
    await dashboardPage.expectWelcomeMessage("Admin");
  });

  test("header nav link navigates to boards", async ({
    loginPage,
    headerPage,
    boardsPage,
    page,
  }) => {
    await loginPage.signIn("admin@example.com", "P@ssw0rd");

    // Click "Boards" in the header
    await headerPage.navigateToBoards();

    await expect(page).toHaveURL(/\/board/);
    await boardsPage.expectVisible();
  });

  test("logged-out user sees sign-in button in header", async ({
    headerPage,
    page,
  }) => {
    // Visit home page without being logged in
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await headerPage.expectSignInButton();
  });
});
