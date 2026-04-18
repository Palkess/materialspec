import { test, expect } from "@playwright/test";

const API_URL = process.env.E2E_API_URL || process.env.PUBLIC_API_URL || "http://localhost:3001";

async function loginAsAdmin(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  const adminEmail = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@materialspec.test";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD || "adminpassword";
  await page.goto("/sv/login");
  await page.fill('input[type="email"]', adminEmail);
  await page.fill('input[type="password"]', adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/sv/specs**", { timeout: 10000 });
}

async function logoutViaAccount(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  await page.goto("/sv/account");
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Logga ut")').click();
  await page.waitForURL(/\/sv\/login/, { timeout: 5000 }).catch(() => {});
}

test.describe("Admin settings — signup toggle", () => {
  test("disabling signup hides the link, gates the page, and blocks the API; re-enabling restores access", async ({
    page,
    request,
  }) => {
    // ── 1. Log in as admin and disable signup ────────────────────────
    await loginAsAdmin(page);
    await page.goto("/sv/admin/settings");
    await page.waitForTimeout(800);

    const toggle = page.getByRole("switch");
    const isOn = (await toggle.getAttribute("aria-checked")) === "true";
    if (!isOn) {
      // Already off from a previous failed run — turn on first, then off
      await toggle.click();
      await page.waitForTimeout(500);
    }
    await toggle.click();
    await page.waitForTimeout(500);
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(page.locator("body")).toContainText("Inställningen har sparats");

    // ── 2. Verify login page has no signup link ───────────────────────
    await logoutViaAccount(page);
    await page.goto("/sv/login");
    await page.waitForTimeout(800);
    await expect(page.locator(`a[href="/sv/signup"]`)).toHaveCount(0);

    // ── 3. Verify /signup shows disabled message, no form ────────────
    await page.goto("/sv/signup");
    await page.waitForTimeout(800);
    await expect(page.getByRole("heading", { name: "Registrering är avstängd" })).toBeVisible();
    await expect(page.locator("main form")).toHaveCount(0);

    // ── 4. Verify API rejects signup directly ────────────────────────
    // Make the request from within the browser so it uses the same origin/format as the tRPC client
    const apiCode = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/trpc/auth.signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ email: `blocked-${Date.now()}@example.com`, name: "Blocked", password: "password123" }),
      });
      const json = await res.json() as { error?: { data?: { code?: string } } };
      return json?.error?.data?.code;
    }, API_URL);
    expect(apiCode).toBe("FORBIDDEN");

    // ── 5. Log back in as admin and re-enable signup ──────────────────
    await loginAsAdmin(page);
    await page.goto("/sv/admin/settings");
    await page.waitForTimeout(800);

    const toggle2 = page.getByRole("switch");
    await toggle2.click();
    await page.waitForTimeout(500);
    await expect(toggle2).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("body")).toContainText("Inställningen har sparats");

    // ── 6. Verify signup link is back on login page ───────────────────
    await logoutViaAccount(page);
    await page.goto("/sv/login");
    await page.waitForTimeout(800);
    await expect(page.locator(`a[href="/sv/signup"]`)).toBeVisible();

    // ── 7. Verify /signup shows the form again ────────────────────────
    await page.goto("/sv/signup");
    await page.waitForTimeout(800);
    await expect(page.locator("main form")).toBeVisible();
  });
});
