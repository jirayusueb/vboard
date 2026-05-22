import { test as base } from "@playwright/test";
import { HeaderPage } from "../pages/header.page";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";
import { BoardsPage } from "../pages/boards.page";
import { BoardEditorPage } from "../pages/board-editor.page";

type PageObjects = {
  headerPage: HeaderPage;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  boardsPage: BoardsPage;
  boardEditorPage: BoardEditorPage;
};

/**
 * Custom fixtures that inject page objects keyed to the test's Page instance.
 * Usage: `const { boardsPage } = test;`
 */
export const test = base.extend<PageObjects>({
  headerPage: async ({ page }, use) => {
    await use(new HeaderPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  boardsPage: async ({ page }, use) => {
    await use(new BoardsPage(page));
  },
  boardEditorPage: async ({ page }, use) => {
    await use(new BoardEditorPage(page));
  },
});

export { expect } from "@playwright/test";
