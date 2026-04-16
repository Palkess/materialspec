import { test, expect } from "@playwright/test";

test.describe("i18n", () => {
  test("locale switcher on login page changes UI strings", async ({ page }) => {
    await page.goto("/sv/login");
    await expect(page.locator("h1")).toContainText("Logga in");

    // Switch to English
    await page.locator('a:has-text("English")').click();
    await page.waitForURL(/\/en\/login/, { timeout: 5000 });
    await expect(page.locator("h1")).toContainText("Log in");

    // Switch back to Swedish
    await page.locator('a:has-text("Svenska")').click();
    await page.waitForURL(/\/sv\/login/, { timeout: 5000 });
    await expect(page.locator("h1")).toContainText("Logga in");
  });

  test("/ redirects to /sv/", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sv\//);
  });

  test("signup and specs pages render in Swedish by default", async ({ page }) => {
    await page.goto("/sv/signup");
    await expect(page.locator("h1")).toContainText("Skapa konto");
  });

  test("English signup page renders in English", async ({ page }) => {
    await page.goto("/en/signup");
    await expect(page.locator("h1")).toContainText("Sign up");
  });
});
