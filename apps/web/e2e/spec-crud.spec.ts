import { test, expect } from "@playwright/test";
import { createTestUser } from "./helpers";

/**
 * Helper: sign up a fresh user via UI and land on /sv/specs.
 */
async function signupAndLand(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  const email = `spec-crud-${Date.now()}@example.com`;
  await page.goto("/sv/signup");
  await page.fill('input[autocomplete="name"]', "Spec Tester");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/sv/specs**", { timeout: 10000 });
  return email;
}

test.describe("Spec CRUD", () => {
  test("create spec with 3 items, save, redirects to edit, appears in list", async ({ page }) => {
    await signupAndLand(page);

    // Navigate to new spec
    await page.goto("/sv/specs/new");
    await page.waitForTimeout(1000);

    // Fill header fields
    await page.fill('input[name="name"]', "Test Spec");
    await page.fill('input[name="responsiblePerson"]', "Anna Svensson");

    // Add 3 items via "Add row" button
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Lägg till rad")');
      await page.waitForTimeout(200);
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();
      const lastRow = rows.nth(rowCount - 1);
      await lastRow.locator('input[placeholder]').first().fill(`Item ${i + 1}`);
    }

    // Save
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Should redirect to edit URL
    await expect(page).toHaveURL(/\/sv\/specs\/.+\/edit/);

    // Go back to list and verify it appears
    await page.goto("/sv/specs");
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toContainText("Test Spec");
  });

  test("edit existing spec changes updatedAt", async ({ page }) => {
    await signupAndLand(page);

    // Create a spec
    await page.goto("/sv/specs/new");
    await page.waitForTimeout(1000);
    await page.fill('input[name="name"]', "Editable Spec");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/sv\/specs\/.+\/edit/, { timeout: 10000 });

    // Note the timestamp from the list
    await page.goto("/sv/specs");
    await page.waitForTimeout(1000);
    const initialTimestamp = await page.locator("td:has-text('Editable Spec') + td + td").first().textContent();

    // Wait a moment, then edit and save
    await page.waitForTimeout(1500);
    await page.locator("a:has-text('Editable Spec')").click();
    await page.waitForURL(/\/edit/, { timeout: 10000 });
    await page.getByLabel(/beskrivning|description/i).first().fill("Updated description");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Check list again — updatedAt should differ
    await page.goto("/sv/specs");
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toContainText("Editable Spec");
  });

  test("duplicate spec shows kopia suffix", async ({ page }) => {
    await signupAndLand(page);

    // Create a spec
    await page.goto("/sv/specs/new");
    await page.waitForTimeout(1000);
    await page.fill('input[name="name"]', "Original Spec");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/edit/, { timeout: 10000 });

    // Go to list and duplicate via the row's kebab popover menu
    await page.goto("/sv/specs");
    await page.waitForTimeout(1000);
    const row = page.locator('tr:has-text("Original Spec")').first();
    await row.locator('button[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /duplicera|duplicate/i }).click();
    await page.waitForTimeout(1000);

    // Both original and copy should appear
    await expect(page.locator("body")).toContainText("Original Spec");
    await expect(page.locator("body")).toContainText("(kopia)");
  });

  test("adding an empty row and saving once clears the unsaved-changes indicator", async ({ page }) => {
    await signupAndLand(page);

    // Create a spec with one named item so we have something to edit
    await page.goto("/sv/specs/new");
    await page.waitForTimeout(1000);
    await page.fill('input[name="name"]', "Empty Row Test Spec");
    await page.click('button:has-text("Lägg till rad")');
    await page.waitForTimeout(300);
    const rows = page.locator("table tbody tr");
    await rows.first().locator("input[placeholder]").first().fill("Item 1");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/sv\/specs\/.+\/edit/, { timeout: 10000 });

    // Navigate to the edit URL fresh so the spec-load effect fires and
    // establishes a clean baseline with DB values
    const editUrl = page.url();
    await page.goto(editUrl);
    await page.waitForTimeout(1500);

    // Precondition: form is clean
    await expect(page.getByText("Du har osparade ändringar")).not.toBeVisible();

    // Add an empty row (leave name blank — this is the scenario that triggered the bug)
    await page.click('button:has-text("Lägg till rad")');
    await page.waitForTimeout(300);
    await expect(page.getByText("Du har osparade ändringar")).toBeVisible();

    // Save once
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // After ONE save the indicator must be gone
    await expect(page.getByText("Du har osparade ändringar")).not.toBeVisible();

    // Navigating back must not trigger the unsaved-changes confirm dialog
    let dialogSeen = false;
    page.on("dialog", async (dialog) => {
      dialogSeen = true;
      await dialog.accept();
    });
    await page.locator("a:has-text('Tillbaka')").first().click();
    await page.waitForURL("**/sv/specs", { timeout: 5000 });
    expect(dialogSeen).toBe(false);
  });

  test("soft delete removes spec from list", async ({ page }) => {
    await signupAndLand(page);

    // Create a spec
    await page.goto("/sv/specs/new");
    await page.waitForTimeout(1000);
    await page.fill('input[name="name"]', "To Delete Spec");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/edit/, { timeout: 10000 });

    // Go to list and delete
    await page.goto("/sv/specs");
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toContainText("To Delete Spec");

    // Accept the confirm dialog
    page.on("dialog", (dialog) => dialog.accept());
    await page.locator('button:has-text("Ta bort")').first().click();
    await page.waitForTimeout(1000);

    // Spec should be gone
    await expect(page.locator("body")).not.toContainText("To Delete Spec");
  });
});
