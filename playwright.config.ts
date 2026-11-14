import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

import { APP_PORT, APP_URL, FAKE_URL, STORAGE_STATE, appEnv } from "./e2e/support/env";

// The R2 test bucket's credentials. In CI they come from secrets instead of this file.
loadEnv({ path: ".env.e2e", quiet: true });

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // The journeys share one database, one Organization and one fake server.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: APP_URL,
    storageState: STORAGE_STATE,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      name: "fake Polar and Chatterbox",
      command: "bun e2e/fakes/server.ts",
      url: `${FAKE_URL}/__test/health`,
      reuseExistingServer: false,
    },
    {
      name: "app",
      // Built and started like production, on its own port, so it can run next to `bun dev`.
      command: `bun run build && bun run start --port ${APP_PORT}`,
      url: `${APP_URL}/auth/sign-in`,
      env: appEnv(process.env),
      timeout: 5 * 60 * 1000,
      reuseExistingServer: false,
    },
  ],
});
