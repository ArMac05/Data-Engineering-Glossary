import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env" });

export default defineConfig({
  testDir: "./e2e",
  retries: process.env.CI ? 2 : 0,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
