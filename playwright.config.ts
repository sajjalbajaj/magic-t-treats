import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration.
 *
 * These specs drive a real browser against a real Supabase project — they are
 * deliberately not mocked, because the things worth testing here (RLS actually
 * blocking anonymous access, the enquiry reaching the database, a session
 * surviving a redirect) only exist when the real stack is wired up.
 *
 * Requires `.env.local` plus E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD for an admin
 * account. Specs that need those credentials skip themselves when they are
 * absent rather than failing, so `npm run test:e2e` is safe on a fresh clone.
 *
 * Before the first run: `npx playwright install chromium`
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // A stray `test.only` should fail the pipeline, not silently skip the suite.
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Most visitors arrive from Instagram on a phone, so mobile is a
    // first-class target rather than an afterthought.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  webServer: {
    command: "npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
