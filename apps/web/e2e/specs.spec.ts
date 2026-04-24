import { test, expect } from "@playwright/test";
import { deleteTestUsers } from "./helpers";

const createdEmails: string[] = [];

test.describe("Spec list and editor", () => {
  test.afterAll(async () => {
    await deleteTestUsers(createdEmails);
  });

  test.beforeEach(async ({ page }) => {
    // Create a fresh user and login
    const email = `spec-${Date.now()}@example.com`;
    createdEmails.push(email);
    await page.goto("/sv/signup");
    await page.fill('input[type="text"]', "Spec Tester");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/sv/specs**", { timeout: 10000 });
  });

  test("empty state shows no specs message", async ({ page }) => {
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toContainText("inga specifikationer");
  });

  test("new spec page loads", async ({ page }) => {
    await page.goto("/sv/specs/new");
    await page.waitForTimeout(1000);
    // The editor should be visible
    await expect(page.locator("body")).toContainText("Spara");
  });
});
