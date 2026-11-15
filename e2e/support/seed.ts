import { createHmac, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import { account, member, organization, session, user, voice } from "../../src/db/schema";
import { APP_URL, AUTH_SECRET, DATABASE_URL } from "./env";
import { putAudio } from "./r2";

/** What every journey starts from: one verified owner of one Organization, one System voice. */
export const OWNER = { id: "user_e2e_owner", name: "Olivia Owner", email: "owner@e2e.test" };
export const OWNER_PASSWORD = "e2e-owner-password";
export const ORGANIZATION = { id: "org_e2e", name: "E2E Organization", slug: "e2e-organization" };
export const SYSTEM_VOICE = { id: "voice_e2e_system", name: "Aaron" };

const OWNER_SESSION_TOKEN = "e2e-owner-session-token";
const SYSTEM_VOICE_KEY = `voices/system/${SYSTEM_VOICE.id}`;
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;

type Database = ReturnType<typeof drizzle<Record<string, never>, Client>>;

async function withDatabase<T>(run: (db: Database) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await run(drizzle(client));
  } finally {
    await client.end();
  }
}

/**
 * The value Better Auth expects in its session cookie: the token, a dot, and the token's
 * HMAC-SHA256 under the auth secret, URL-encoded. If a Better Auth upgrade changes this,
 * every journey lands on the sign-in page.
 */
function signedSessionCookie(token: string): string {
  const signature = createHmac("sha256", AUTH_SECRET).update(token).digest("base64");
  return encodeURIComponent(`${token}.${signature}`);
}

/** A browser state signed in with the given session; pass it to `browser.newContext`. */
function storageStateFor(token: string) {
  return {
    cookies: [
      {
        name: "better-auth.session_token",
        value: signedSessionCookie(token),
        domain: new URL(APP_URL).hostname,
        path: "/",
        expires: Math.floor((Date.now() + SESSION_LIFETIME_MS) / 1000),
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}

async function insertSession(db: Database, token: string, userId: string, orgId: string) {
  await db.insert(session).values({
    id: `session_${token}`,
    token,
    userId,
    activeOrganizationId: orgId,
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    updatedAt: new Date(),
  });
}

/** Seeds the starting state and returns the owner's signed-in browser state. */
export async function seedDatabase() {
  const password = await hashPassword(OWNER_PASSWORD);

  await withDatabase(async (db) => {
    await db.insert(user).values({ ...OWNER, emailVerified: true });
    // Lets the owner sign in through the form; every other journey uses the session below.
    await db.insert(account).values({
      id: "account_e2e_owner",
      accountId: OWNER.id,
      providerId: "credential",
      userId: OWNER.id,
      password,
      updatedAt: new Date(),
    });
    await db.insert(organization).values(ORGANIZATION);
    await db.insert(member).values({
      id: "member_e2e_owner",
      organizationId: ORGANIZATION.id,
      userId: OWNER.id,
      role: "owner",
    });
    await insertSession(db, OWNER_SESSION_TOKEN, OWNER.id, ORGANIZATION.id);
    await db.insert(voice).values({
      id: SYSTEM_VOICE.id,
      name: SYSTEM_VOICE.name,
      description: "Soothing and calm",
      variant: "SYSTEM",
      r2ObjectKey: SYSTEM_VOICE_KEY,
    });
  });

  return storageStateFor(OWNER_SESSION_TOKEN);
}

/** The System voice's sample, so its preview plays. scripts/system-voices is not in git. */
export async function uploadSystemVoiceSample() {
  await putAudio(SYSTEM_VOICE_KEY);
}

/**
 * Adds a second user to the seeded Organization with the given role, already signed in.
 * Returns the browser state to open a context as them.
 */
export async function addSignedInMember(role: "member" | "admin") {
  const suffix = randomUUID();
  const userId = `user_${suffix}`;
  const token = `token-${suffix}`;

  await withDatabase(async (db) => {
    await db.insert(user).values({
      id: userId,
      name: "Mia Member",
      email: `${suffix}@e2e.test`,
      emailVerified: true,
    });
    await db.insert(member).values({
      id: `member_${suffix}`,
      organizationId: ORGANIZATION.id,
      userId,
      role,
    });
    await insertSession(db, token, userId, ORGANIZATION.id);
  });

  return storageStateFor(token);
}

/** Adds a Custom voice row to an Organization. Its audio is only in R2 if a test puts it there. */
export async function addCustomVoice(orgId: string, name: string) {
  const id = `voice_${randomUUID()}`;
  const r2ObjectKey = `voices/orgs/${orgId}/${id}`;
  await withDatabase((db) =>
    db.insert(voice).values({ id, orgId, name, variant: "CUSTOM", r2ObjectKey }),
  );
  return { id, name, r2ObjectKey };
}

/**
 * Adds another Organization owned by the seeded owner, and a session of theirs with it
 * active, so a journey can destroy it without touching what the other journeys share.
 */
export async function addOrganizationOwnedByOwner(name: string) {
  const suffix = randomUUID();
  const id = `org_${suffix}`;
  const token = `token-${suffix}`;

  await withDatabase(async (db) => {
    await db.insert(organization).values({ id, name, slug: `org-${suffix}` });
    await db.insert(member).values({
      id: `member_${suffix}`,
      organizationId: id,
      userId: OWNER.id,
      role: "owner",
    });
    await insertSession(db, token, OWNER.id, id);
  });

  return { id, name, storageState: storageStateFor(token) };
}

export async function organizationExists(id: string): Promise<boolean> {
  const rows = await withDatabase((db) =>
    db.select({ id: organization.id }).from(organization).where(eq(organization.id, id)),
  );
  return rows.length > 0;
}

export async function customVoicesOf(orgId: string) {
  return withDatabase((db) =>
    db
      .select({ id: voice.id, name: voice.name, r2ObjectKey: voice.r2ObjectKey })
      .from(voice)
      .where(eq(voice.orgId, orgId)),
  );
}
