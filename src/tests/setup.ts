import { sql } from "drizzle-orm";
import { beforeEach, vi } from "vitest";

import { db } from "@/db";
import { organization, outbox, rateLimit, user, verification, voice } from "@/db/schema";
import { env } from "@/lib/env";
import { fakeFetch, resetExternal } from "./external";
import { signOut } from "./session";

// Tests empty every table. Refuse to run against anything but the throwaway database.
if (!env.DATABASE_URL.endsWith("/echonic_test")) {
  throw new Error(`Tests must run against the echonic_test database, not ${env.DATABASE_URL}`);
}

// The session comes from signInAs() instead of a Better Auth cookie.
vi.mock("@/lib/auth", async () => {
  const { currentSession } = await import("./session");
  return { auth: { api: { getSession: async () => currentSession() } } };
});

// `after` only works while Next is handling a request. Dropping the callback also keeps
// outbox rows in the table, where tests can assert on them.
vi.mock("next/server", async (importOriginal) => {
  const original = await importOriginal<typeof import("next/server")>();
  return { ...original, after: vi.fn<typeof original.after>() };
});

// External services: no test may reach the network. The stand-ins live in ./external
// and are only imported here, never created here (see the note in that file).
vi.stubGlobal("fetch", fakeFetch);

vi.mock("@/lib/r2", async (importOriginal) => {
  const { fakeR2 } = await import("./external");
  return { ...(await importOriginal<typeof import("@/lib/r2")>()), ...fakeR2 };
});

vi.mock("@/lib/polar", async (importOriginal) => {
  const { fakePolar } = await import("./external");
  return { ...(await importOriginal<typeof import("@/lib/polar")>()), polar: fakePolar };
});

vi.mock("@/lib/chatterbox-client", async () => {
  const { fakeChatterbox } = await import("./external");
  return { chatterbox: fakeChatterbox };
});

beforeEach(async () => {
  signOut();
  resetExternal();
  // Forgets recorded calls and whatever a test told a stand-in to do, and puts back the
  // default behaviour it was created with.
  vi.resetAllMocks();
  // CASCADE reaches every table that references these, which is all the others.
  await db.execute(
    sql`truncate table ${organization}, ${user}, ${voice}, ${outbox}, ${verification}, ${rateLimit} cascade`,
  );
});
