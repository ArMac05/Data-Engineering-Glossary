import { test, expect } from "@playwright/test";

// Authentication happens once in auth.setup.ts; this test starts already
// signed in via the saved storageState (see playwright.config.ts).
test("admin can create, view, edit, and delete a term", async ({ page }) => {
  const stamp = Date.now();
  const name = `E2E Term ${stamp}`;
  const slug = `e2e-term-${stamp}`;

  // create (published)
  await page.goto("/admin/terms/new");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Short definition").fill("Created by Playwright.");
  await page.getByLabel("Published").check();
  await page.getByRole("button", { name: "Create term" }).click();
  await expect(page).toHaveURL("/admin");

  // shows on the public site
  await page.goto(`/terms/${slug}`);
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // edit via the dashboard
  await page.goto("/admin");
  await page
    .locator("li", { hasText: name })
    .getByRole("link", { name: "Edit" })
    .click();
  await page.getByLabel("Short definition").fill("Edited by Playwright.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL("/admin");

  // delete: the row's Delete opens a styled confirm dialog; confirm inside it
  await page
    .locator("li", { hasText: name })
    .getByRole("button", { name: "Delete" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.locator("li", { hasText: name })).toHaveCount(0);
});
