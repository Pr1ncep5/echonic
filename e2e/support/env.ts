/**
 * Where everything in an end-to-end run lives. The app is built and started on its own
 * port so it can run next to `bun dev`, and talks to the fake server instead of Polar and
 * Chatterbox. Only R2 is real: its values come from .env.e2e (or CI secrets).
 */
export const APP_PORT = 3100;
export const APP_URL = `http://localhost:${APP_PORT}`;

export const FAKE_PORT = 4010;
export const FAKE_URL = `http://localhost:${FAKE_PORT}`;

// The same Postgres container as the Vitest tests, in a database of its own.
export const DATABASE_ADMIN_URL = "postgresql://echonic:echonic@localhost:5433/postgres";
export const DATABASE_NAME = "echonic_e2e";
export const DATABASE_URL = `postgresql://echonic:echonic@localhost:5433/${DATABASE_NAME}`;

/**
 * Signs the session cookie; shared by the app and the seed. Not a real secret. Also used
 * wherever the env schema wants a secret of 32 characters that the fakes never check.
 */
export const AUTH_SECRET = "e2e-secret-e2e-secret-e2e-secret-e2e";

/** What a journey sends to /api/cron/outbox to run the outbox, as the scheduler would. */
export const CRON_SECRET = "e2e-cron-secret-e2e-cron-secret-e2e";

export const STORAGE_STATE = "e2e/.auth/owner.json";

const R2_NAMES = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

/** The R2 test bucket's settings, or an error naming what is missing. */
export function r2Env(source: NodeJS.ProcessEnv): Record<(typeof R2_NAMES)[number], string> {
  const missing = R2_NAMES.filter((name) => !source[name]);
  if (missing.length > 0) {
    throw new Error(
      `End-to-end tests need the R2 test bucket. Missing ${missing.join(", ")}: put them in .env.e2e.`,
    );
  }
  return {
    R2_ACCOUNT_ID: source.R2_ACCOUNT_ID ?? "",
    R2_ACCESS_KEY_ID: source.R2_ACCESS_KEY_ID ?? "",
    R2_SECRET_ACCESS_KEY: source.R2_SECRET_ACCESS_KEY ?? "",
    R2_BUCKET_NAME: source.R2_BUCKET_NAME ?? "",
  };
}

/** The environment the app is built and started with. */
export function appEnv(source: NodeJS.ProcessEnv): Record<string, string> {
  return {
    ...r2Env(source),
    DATABASE_URL,

    BETTER_AUTH_SECRET: AUTH_SECRET,
    BETTER_AUTH_URL: APP_URL,
    NEXT_PUBLIC_BETTER_AUTH_URL: APP_URL,
    APP_URL,

    GITHUB_CLIENT_ID: "e2e",
    GITHUB_CLIENT_SECRET: AUTH_SECRET,
    GOOGLE_CLIENT_ID: "e2e",
    GOOGLE_CLIENT_SECRET: AUTH_SECRET,

    CHATTERBOX_API_KEY: "e2e",
    CHATTERBOX_API_URL: FAKE_URL,

    POLAR_ACCESS_TOKEN: AUTH_SECRET,
    POLAR_SERVER: "sandbox",
    POLAR_PRODUCT_ID: "e2e",
    POLAR_API_URL: FAKE_URL,

    SENTRY_DSN: "https://public@sentry.invalid/1",
    NEXT_PUBLIC_SENTRY_DSN: "https://public@sentry.invalid/1",

    CRON_SECRET,
  };
}
