import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

import {
  APP_URL,
  DATABASE_ADMIN_URL,
  DATABASE_NAME,
  DATABASE_URL,
  STORAGE_STATE,
  appEnv,
} from "./support/env";
import { seedDatabase, uploadSystemVoiceSample } from "./support/seed";

/**
 * Runs once before the journeys: rebuilds the end-to-end database, seeds it, and saves the
 * owner's session cookie where every test picks it up.
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

  const { sessionCookie, expires } = await seedDatabase();
  await uploadSystemVoiceSample(process.env);

  await mkdir(path.dirname(STORAGE_STATE), { recursive: true });
  await writeFile(
    STORAGE_STATE,
    JSON.stringify({
      cookies: [
        {
          name: "better-auth.session_token",
          value: sessionCookie,
          domain: new URL(APP_URL).hostname,
          path: "/",
          expires: Math.floor(expires.getTime() / 1000),
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
}
