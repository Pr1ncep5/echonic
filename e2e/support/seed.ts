import { createHmac, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import { account, member, organization, session, user, voice } from "../../src/db/schema";
import { APP_URL, AUTH_SECRET, DATABASE_URL } from "./env";
import { putAudio } from "./r2";

/** The one row every journey shares. It is only read, so sharing it is safe. */
export const SYSTEM_VOICE = { id: "voice_e2e_system", name: "Aaron" };

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
  const cookie = {
    domain: new URL(APP_URL).hostname,
    path: "/",
    expires: Math.floor((Date.now() + SESSION_LIFETIME_MS) / 1000),
    secure: false,
    sameSite: "Lax" as const,
  };
  return {
    cookies: [
      {
        ...cookie,
        name: "better-auth.session_token",
        value: signedSessionCookie(token),
        httpOnly: true,
      },
      // The sidebar starts collapsed to icons, which hides the usage card. This is the
      // cookie the app sets when the user expands it.
      { ...cookie, name: "sidebar_state", value: "true", httpOnly: false },
    ],
    origins: [],
  };
}

export type StorageState = ReturnType<typeof storageStateFor>;
export const SIGNED_OUT: StorageState = { cookies: [], origins: [] };

/** A verified user who belongs to the Organization and has it active in a live session. */
async function insertSignedInMember(
  db: Database,
  orgId: string,
  role: "owner" | "admin" | "member",
  name: string,
) {
  const suffix = randomUUID();
  const signedInUser = { id: `user_${suffix}`, name, email: `${suffix}@e2e.test` };
  const token = `token-${suffix}`;

  await db.insert(user).values({ ...signedInUser, emailVerified: true });
  await db.insert(member).values({
    id: `member_${suffix}`,
    organizationId: orgId,
    userId: signedInUser.id,
    role,
  });
  await db.insert(session).values({
    id: `session_${suffix}`,
    token,
    userId: signedInUser.id,
    activeOrganizationId: orgId,
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    updatedAt: new Date(),
  });

  return { ...signedInUser, storageState: storageStateFor(token) };
}

/** Run once, before any journey. */
export async function seedSystemVoice() {
  await withDatabase((db) =>
    db.insert(voice).values({
      id: SYSTEM_VOICE.id,
      name: SYSTEM_VOICE.name,
      description: "Soothing and calm",
      variant: "SYSTEM",
      r2ObjectKey: SYSTEM_VOICE_KEY,
    }),
  );
  // Its sample, so the preview plays. scripts/system-voices is not in git.
  await putAudio(SYSTEM_VOICE_KEY);
}

/**
 * A new Organization with a signed-in owner. Every journey gets its own, so journeys can
 * run in parallel and change or delete theirs without affecting each other.
 */
export async function createOrganization() {
  const suffix = randomUUID();
  const created = {
    id: `org_${suffix}`,
    name: `Org ${suffix.slice(0, 8)}`,
    slug: `org-${suffix}`,
  };

  const owner = await withDatabase(async (db) => {
    await db.insert(organization).values(created);
    return insertSignedInMember(db, created.id, "owner", "Olivia Owner");
  });

  return { ...created, owner };
}

export type TestOrganization = Awaited<ReturnType<typeof createOrganization>>;

/** Adds another signed-in user to the Organization with the given role. */
export async function addMember(orgId: string, role: "admin" | "member") {
  return withDatabase((db) => insertSignedInMember(db, orgId, role, "Mia Member"));
}

/** Lets the user sign in through the form. Returns the password. */
export async function givePassword(userId: string): Promise<string> {
  const password = `password-${randomUUID()}`;
  const hash = await hashPassword(password);
  await withDatabase((db) =>
    db.insert(account).values({
      id: `account_${randomUUID()}`,
      accountId: userId,
      providerId: "credential",
      userId,
      password: hash,
      updatedAt: new Date(),
    }),
  );
  return password;
}

/** Adds a Custom voice row. Its audio is only in R2 if the journey puts it there. */
export async function addCustomVoice(orgId: string, name: string) {
  const id = `voice_${randomUUID()}`;
  const r2ObjectKey = `voices/orgs/${orgId}/${id}`;
  await withDatabase((db) =>
    db.insert(voice).values({ id, orgId, name, variant: "CUSTOM", r2ObjectKey }),
  );
  return { id, name, r2ObjectKey };
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
