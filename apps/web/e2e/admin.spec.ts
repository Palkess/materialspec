import { test, expect } from "@playwright/test";

const API_URL = process.env.E2E_API_URL || "http://localhost:3001";

/**
 * Sign up and return email. Lands on /sv/specs.
 */
async function signup(
  page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never,
  name: string
) {
  const email = `${name.toLowerCase().replace(/\s/g, "-")}-${Date.now()}@example.com`;
  await page.goto("/sv/signup");
  await page.fill('input[autocomplete="name"]', name);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/sv/specs**", { timeout: 10000 });
  return email;
}

/**
 * Login as the seeded admin (ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD from env).
 */
async function loginAsAdmin(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin@materialspec.test";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || "adminpassword";

  await page.goto("/sv/login");
  await page.fill('input[type="email"]', adminEmail);
  await page.fill('input[type="password"]', adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/sv/specs**", { timeout: 10000 });
}

test.describe("Admin", () => {
  test("admin generates reset link, user consumes it and logs in with new password", async ({
    page,
  }) => {
    // Create a target user
    const targetEmail = await signup(page, "Reset Target");

    // Log out
    await page.goto("/sv/account");
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Logga ut")').click();
    await page.waitForURL(/\/sv\/login/, { timeout: 5000 }).catch(() => {});

    // Log in as admin
    await loginAsAdmin(page);
    await page.goto("/sv/admin/users");
    await page.waitForTimeout(1000);

    // Find the target user row and generate reset link
    const userRow = page.locator(`tr:has-text("${targetEmail}")`);
    await userRow.locator('button:has-text("Generera")').click();
    await page.waitForTimeout(500);

    // Copy the reset link from the input
    const resetInput = page.locator(`tr:has-text("${targetEmail}") input[readonly]`);
    const resetUrl = await resetInput.inputValue();
    expect(resetUrl).toContain("reset-password");

    // Log out admin
    await page.goto("/sv/account");
    await page.locator('button:has-text("Logga ut")').click();
    await page.waitForURL(/\/sv\/login/, { timeout: 5000 }).catch(() => {});

    // Visit the reset link
    await page.goto(resetUrl);
    await page.waitForTimeout(1000);

    // Set new password
    const newPassword = "newPassword456!";
    const inputs = page.locator('input[type="password"]');
    await inputs.first().fill(newPassword);
    await inputs.nth(1).fill(newPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Log in with new password
    await page.goto("/sv/login");
    await page.fill('input[type="email"]', targetEmail);
    await page.fill('input[type="password"]', newPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/sv/specs**", { timeout: 10000 });
    await expect(page).toHaveURL(/\/sv\/specs/);
  });

  test("admin promotes user to admin", async ({ page }) => {
    const targetEmail = await signup(page, "Promote Me");

    // Log out
    await page.goto("/sv/account");
    await page.locator('button:has-text("Logga ut")').click();
    await page.waitForURL(/\/sv\/login/, { timeout: 5000 }).catch(() => {});

    // Log in as admin
    await loginAsAdmin(page);
    await page.goto("/sv/admin/users");
    await page.waitForTimeout(1000);

    const userRow = page.locator(`tr:has-text("${targetEmail}")`);
    await userRow.locator('button:has-text("Gör till admin")').click();
    await page.waitForTimeout(500);

    // Badge should now show Admin
    await expect(userRow.locator('span:has-text("Admin")')).toBeVisible();
  });

  test("last-admin demotion is rejected with visible error", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/sv/admin/users");
    await page.waitForTimeout(1000);

    const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin@materialspec.test";

    // Establish precondition: the seeded admin must be the only admin.
    // Earlier tests in this file may have promoted other users — demote them first.
    while (true) {
      const otherDemoteButtons = page.locator(
        `tr:not(:has-text("${adminEmail}")) button:has-text("Ta bort admin")`
      );
      const count = await otherDemoteButtons.count();
      if (count === 0) break;
      await otherDemoteButtons.first().click();
      await page.waitForTimeout(300);
    }

    // Now try to demote the sole remaining admin
    const adminRow = page.locator(`tr:has-text("${adminEmail}")`);
    await adminRow.locator('button:has-text("Ta bort admin")').click();
    await page.waitForTimeout(500);

    // An error message should be visible
    await expect(page.locator("body")).toContainText("sista");
  });
});
