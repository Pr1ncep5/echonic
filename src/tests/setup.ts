import { sql } from "drizzle-orm";
import { beforeEach, vi } from "vitest";

import { db } from "@/db";
import { organization, outbox, rateLimit, user, verification, voice } from "@/db/schema";
import { env } from "@/lib/env";
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

// External services: no test may reach the network. Tests that care about a call
// configure these mocks with vi.mocked().
vi.mock("@/lib/r2", async (importOriginal) => {
  const { Effect } = await import("effect");
  const original = await importOriginal<typeof import("@/lib/r2")>();
  return {
    ...original,
    uploadAudio: vi.fn<typeof original.uploadAudio>(() => Effect.void),
    deleteAudio: vi.fn<typeof original.deleteAudio>(async () => {}),
    deleteAudioByPrefix: vi.fn<typeof original.deleteAudioByPrefix>(async () => {}),
    getSignedAudioUrl: vi.fn<typeof original.getSignedAudioUrl>(
      async (key) => `https://r2.invalid/${key}`,
    ),
  };
});

vi.mock("@/lib/polar", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/polar")>();
  return {
    ...original,
    polar: {
      customers: {
        getStateExternal: vi.fn<typeof original.polar.customers.getStateExternal>(),
      },
      subscriptions: { revoke: vi.fn<typeof original.polar.subscriptions.revoke>() },
      events: { ingest: vi.fn<typeof original.polar.events.ingest>() },
    },
  };
});

beforeEach(async () => {
  signOut();
  // Forgets recorded calls but keeps the default behaviour given to the mocks above.
  vi.clearAllMocks();
  // CASCADE reaches every table that references these, which is all the others.
  await db.execute(
    sql`truncate table ${organization}, ${user}, ${voice}, ${outbox}, ${verification}, ${rateLimit} cascade`,
  );
});
