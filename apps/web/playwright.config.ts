import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env" });

const authFile = "playwright/.auth/admin.json";

export default defineConfig({
  testDir: "./e2e",
  // 0 retries: with storageState the tests don't re-authenticate, but retrying
  // still re-runs the setup sign-in, so we keep auth calls to a minimum.
  retries: 0,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      // Authenticated admin CRUD flow. Reuses the saved session from `setup`.
      name: "chromium",
      testMatch: /admin\.spec\.ts/,
      dependencies: ["setup"],
      use: { storageState: authFile },
    },
    {
      // Accessibility scan of PUBLIC pages only. No `setup` dependency and no
      // storageState, so it never signs in — which means it can't trip the
      // Supabase per-IP auth rate limit the way the admin flow can.
      name: "a11y",
      testMatch: /a11y\.spec\.ts/,
    },
  ],
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
