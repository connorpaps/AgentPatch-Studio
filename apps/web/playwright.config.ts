import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the live-URL smoke test.
 *
 * Runs against the deployed Vercel URL by default. Override via
 * PLAYWRIGHT_BASE_URL when smoke-testing a local stack instead.
 *
 * Single worker / chromium-only because the public free-tier CI minutes
 * are limited and the smoke test only has ~6 assertions.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "https://agent-patch-studio-web.vercel.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
