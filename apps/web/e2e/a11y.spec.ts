import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Accessibility scan of the public pages. axe-core checks WCAG 2.0/2.1 A + AA
// rules — semantics, labels, roles, and color contrast — so this one spec
// covers the contrast concern across the public templates.
//
// We only scan unauthenticated pages here. The admin pages live behind the
// Supabase login, and signing in from CI risks the per-IP auth rate limit
// (see the `chromium` vs `a11y` split in playwright.config.ts).

async function scan(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  // On failure, the violation list is the most useful thing to read, so attach
  // it to the report before asserting.
  expect(results.violations).toEqual([]);
}

test("home page has no a11y violations", async ({ page }) => {
  await page.goto("/");
  await scan(page);
});

test("search results page has no a11y violations", async ({ page }) => {
  await page.goto("/search?q=data");
  await scan(page);
});

test("quiz page has no a11y violations", async ({ page }) => {
  await page.goto("/quiz");
  await scan(page);
});

test("a term detail page has no a11y violations", async ({ page }) => {
  // Pull a real term slug off the home page rather than hard-coding one, then
  // do a full navigation to it. A hard goto (not a client-side click) means
  // axe scans the server-rendered page — including the <title> that the term's
  // generateMetadata sets, which isn't applied yet mid-soft-navigation.
  await page.goto("/");
  const href = await page
    .locator('a[href^="/terms/"]')
    .first()
    .getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  await scan(page);
});
