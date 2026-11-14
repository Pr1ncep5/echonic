import { defineConfig } from "vitest/config";

/**
 * The environment every test runs with. Nothing here is a real credential: the database is
 * the throwaway one from compose.test.yaml, and R2, Polar and the session are replaced in
 * src/tests/setup.ts, so the other values only have to satisfy the schema in `@/lib/env`.
 * Being set here, they also win over a developer's .env, which dotenv never overrides.
 */
const appUrl = "http://localhost:3000";

// Several secrets are validated to be at least 32 characters long.
const secret = "test-secret-test-secret-test-secret";

const testEnv = {
  DATABASE_URL: "postgresql://echonic:echonic@localhost:5433/echonic_test",

  BETTER_AUTH_SECRET: secret,
  BETTER_AUTH_URL: appUrl,
  NEXT_PUBLIC_BETTER_AUTH_URL: appUrl,
  APP_URL: appUrl,

  GITHUB_CLIENT_ID: "test",
  GITHUB_CLIENT_SECRET: secret,
  GOOGLE_CLIENT_ID: "test",
  GOOGLE_CLIENT_SECRET: secret,

  R2_ACCOUNT_ID: "test",
  R2_ACCESS_KEY_ID: "test",
  R2_SECRET_ACCESS_KEY: secret,
  R2_BUCKET_NAME: "test",

  CHATTERBOX_API_KEY: "test",
  CHATTERBOX_API_URL: "http://localhost:9",

  SENTRY_DSN: "https://public@sentry.invalid/1",
  NEXT_PUBLIC_SENTRY_DSN: "https://public@sentry.invalid/1",

  POLAR_ACCESS_TOKEN: secret,
  POLAR_SERVER: "sandbox",
  POLAR_PRODUCT_ID: "test",

  CRON_SECRET: "test-cron-secret-test-cron-secret-test",
};

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: testEnv,
    globalSetup: ["./src/tests/global-setup.ts"],
    setupFiles: ["./src/tests/setup.ts"],
    // Every test file shares one database and empties it before each test, so files
    // must not run at the same time.
    fileParallelism: false,
  },
});
