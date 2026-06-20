import { test as setup, expect } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL!;
const password = process.env.E2E_ADMIN_PASSWORD!;
const authFile = "playwright/.auth/admin.json";

// Runs once before the test project. Signs in (this is our sign-in check) and
// saves the authenticated session so the actual tests don't re-authenticate —
// keeping us well under Supabase's auth rate limits.
setup("authenticate", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/admin");

  await page.context().storageState({ path: authFile });
});
