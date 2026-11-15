import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

import { APP_PORT, APP_URL, FAKE_URL, appEnv } from "./e2e/support/env";

// The R2 test bucket's credentials. In CI they come from secrets instead of this file.
loadEnv({ path: ".env.e2e", quiet: true });

const isCI = Boolean(process.env.CI);

// The conventions behind these settings are in e2e/ARCHITECTURE.md.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Every journey has its own Organization (e2e/support/test.ts), so they can run together.
  fullyParallel: true,
  // One app and one Postgres serve all workers; more than this makes journeys slow, not fast.
  workers: isCI ? 2 : 4,
  forbidOnly: isCI,
  // A journey that only passes on retry is reported as flaky: fix it, do not raise this.
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: APP_URL,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      name: "fake Polar and Chatterbox",
      command: "bun e2e/fakes/server.ts",
      url: `${FAKE_URL}/__test/health`,
      // Locally, servers left running by `bun run e2e:serve` are used as they are.
      reuseExistingServer: !isCI,
    },
    {
      name: "app",
      // Built and started like production, on its own port, so it can run next to `bun dev`.
      command: `bun run build && bun run start --port ${APP_PORT}`,
      url: `${APP_URL}/auth/sign-in`,
      env: appEnv(process.env),
      timeout: 5 * 60 * 1000,
      reuseExistingServer: !isCI,
    },
  ],
});
