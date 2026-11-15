import { execSync } from "node:child_process";
import { Client } from "pg";

import { DATABASE_ADMIN_URL, DATABASE_NAME, DATABASE_URL, appEnv } from "./support/env";
import { seedSystemVoice } from "./support/seed";

/**
 * Runs once before the journeys: rebuilds the end-to-end database and seeds the one thing
 * they share, a System voice. Everything else a journey needs it creates for itself (see
 * support/test.ts).
 */
export default async function globalSetup() {
  const admin = new Client({ connectionString: DATABASE_ADMIN_URL });
  try {
    await admin.connect();
  } catch (cause) {
    throw new Error(
      "The test database is not reachable. Start it with `bun run test:db` (needs Docker).",
      { cause },
    );
  }
  const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    DATABASE_NAME,
  ]);
  if (existing.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${DATABASE_NAME}`);
  }
  await admin.end();

  const database = new Client({ connectionString: DATABASE_URL });
  await database.connect();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await database.end();

  execSync("bunx drizzle-kit push --force", {
    stdio: "pipe",
    env: { ...process.env, ...appEnv(process.env) },
  });

  await seedSystemVoice();
}
