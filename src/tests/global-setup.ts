import { execSync } from "node:child_process";
import { Client } from "pg";
import type { TestProject } from "vitest/node";

/**
 * Runs once before all tests: rebuilds the test database from the current schema.
 * The schema is dropped first so `drizzle-kit push` always starts from nothing and can
 * never stop to ask how to migrate what an earlier run left behind.
 */
export default async function globalSetup(project: TestProject) {
  const testEnv = project.config.env;
  const databaseUrl = testEnv.DATABASE_URL;
  // Everything in this database is dropped below, so it must be the throwaway one.
  if (!databaseUrl?.endsWith("/echonic_test")) {
    throw new Error(`Tests must run against the echonic_test database, not ${databaseUrl}`);
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
  } catch (cause) {
    throw new Error(
      "The test database is not reachable. Start it with `bun run test:db` (needs Docker).",
      { cause },
    );
  }
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await client.end();

  execSync("bunx drizzle-kit push --force", {
    stdio: "pipe",
    // The child needs PATH and friends from the parent, plus the test values on top.
    env: { ...process.env, ...testEnv },
  });
}
