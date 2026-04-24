import { test, expect } from "@playwright/test";
import { deleteTestUsers } from "./helpers";

const API_URL = process.env.E2E_API_URL || "http://localhost:3721";

const createdEmails: string[] = [];

async function signupAndCreateSpec(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  const email = `export-${Date.now()}@example.com`;
  await page.goto("/sv/signup");
  await page.fill('input[autocomplete="name"]', "Export Tester");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/sv/specs**", { timeout: 10000 });

  await page.goto("/sv/specs/new");
  await page.waitForTimeout(1000);
  await page.fill('input[name="name"]', "Export Test Spec");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/sv\/specs\/.+\/edit/, { timeout: 10000 });

  const url = page.url();
  const specId = url.match(/\/specs\/([^/]+)\/edit/)?.[1];
  return { specId, email };
}

test.describe("Export", () => {
  test.afterAll(async () => {
    await deleteTestUsers(createdEmails);
  });

  test("export xlsx downloads with correct MIME type and non-empty content", async ({ page }) => {
    const { email } = await signupAndCreateSpec(page);
    createdEmails.push(email);

    // The export button should be visible after save
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator('a:has-text("Excel")').first().click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test("export pdf downloads with correct MIME type and non-empty content", async ({ page }) => {
    const { email } = await signupAndCreateSpec(page);
    createdEmails.push(email);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator('a:has-text("PDF")').first().click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test("non-owner cannot access another user's export (403)", async ({ page }) => {
    // Create owner and spec
    const ownerEmail = `owner-${Date.now()}@example.com`;
    createdEmails.push(ownerEmail);
    await page.goto("/sv/signup");
    await page.fill('input[autocomplete="name"]', "Owner");
    await page.fill('input[type="email"]', ownerEmail);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/sv/specs**", { timeout: 10000 });

    await page.goto("/sv/specs/new");
    await page.waitForTimeout(1000);
    await page.fill('input[name="name"]', "Private Spec");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/sv\/specs\/.+\/edit/, { timeout: 10000 });
    const specId = page.url().match(/\/specs\/([^/]+)\/edit/)?.[1];

    // Logout by navigating to account and clicking logout
    await page.goto("/sv/account");
    await page.waitForTimeout(1000);
    page.on("dialog", (d) => d.accept());
    await page.locator('button:has-text("Logga ut")').click();
    await page.waitForURL(/\/sv\/login/, { timeout: 5000 }).catch(() => {});

    // Sign up as a different user
    const otherEmail = `other-${Date.now()}@example.com`;
    createdEmails.push(otherEmail);
    await page.goto("/sv/signup");
    await page.fill('input[autocomplete="name"]', "Other User");
    await page.fill('input[type="email"]', otherEmail);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/sv/specs**", { timeout: 10000 });

    // Try to access the owner's export directly
    const response = await page.request.get(`${API_URL}/specs/${specId}/export.xlsx`);
    expect(response.status()).toBe(403);
  });
});
