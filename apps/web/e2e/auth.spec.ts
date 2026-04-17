import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("signup flow creates account and redirects to specs", async ({
    page,
  }) => {
    await page.goto("/sv/signup");
    await expect(page.locator("h1")).toContainText("Skapa konto");

    const email = `signup-${Date.now()}@example.com`;
    await page.fill('input[type="text"]', "Test User");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/sv/specs**", { timeout: 10000 });
    await expect(page).toHaveURL(/\/sv\/specs/);
  });

  test("login flow with valid credentials", async ({ page }) => {
    // First create a user via signup
    const email = `login-${Date.now()}@example.com`;
    await page.goto("/sv/signup");
    await page.fill('input[type="text"]', "Login Test");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/sv/specs**");

    // Logout via the real UI affordance
    await page.goto("/sv/account");
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Logga ut")').click();
    await page.waitForURL(/\/sv\/login/, { timeout: 5000 });

    // Now login
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/sv/specs**", { timeout: 10000 });
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/sv/login");
    await page.fill('input[type="email"]', "wrong@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    // Should still be on login page with error
    await expect(page).toHaveURL(/\/sv\/login/);
  });

  test("/ redirects to /sv/", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sv\//);
  });

  test("locale switcher navigates between sv and en", async ({ page }) => {
    await page.goto("/sv/login");
    await expect(page.locator("h1")).toContainText("Logga in");

    await page.goto("/en/login");
    await expect(page.locator("h1")).toContainText("Log in");
  });

  test("logout redirects to login", async ({ page }) => {
    // Sign up first
    const email = `logout-${Date.now()}@example.com`;
    await page.goto("/sv/signup");
    await page.fill('input[autocomplete="name"]', "Logout Tester");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/sv/specs**", { timeout: 10000 });

    // Go to account page and log out
    await page.goto("/sv/account");
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Logga ut")').click();
    await page.waitForURL(/\/sv\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/sv\/login/);
  });
});
