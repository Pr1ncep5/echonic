import { createHmac } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import { member, organization, session, user, voice } from "../../src/db/schema";
import { wavOfSeconds } from "../../src/tests/audio";
import { AUTH_SECRET, DATABASE_URL, r2Env } from "./env";

/** What every journey starts from: one verified owner of one Organization, one System voice. */
export const OWNER = { id: "user_e2e_owner", name: "Olivia Owner", email: "owner@e2e.test" };
export const ORGANIZATION = { id: "org_e2e", name: "E2E Organization", slug: "e2e-organization" };
export const SYSTEM_VOICE = { id: "voice_e2e_system", name: "Aaron" };

const SESSION_TOKEN = "e2e-owner-session-token";
const SYSTEM_VOICE_KEY = `voices/system/${SYSTEM_VOICE.id}`;

/**
 * The value Better Auth expects in its session cookie: the token, a dot, and the token's
 * HMAC-SHA256 under the auth secret, URL-encoded. If a Better Auth upgrade changes this,
 * every journey lands on the sign-in page.
 */
export function signedSessionCookie(token: string): string {
  const signature = createHmac("sha256", AUTH_SECRET).update(token).digest("base64");
  return encodeURIComponent(`${token}.${signature}`);
}

export async function seedDatabase(): Promise<{ sessionCookie: string; expires: Date }> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const db = drizzle(client);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(user).values({ ...OWNER, emailVerified: true });
  await db.insert(organization).values(ORGANIZATION);
  await db.insert(member).values({
    id: "member_e2e_owner",
    organizationId: ORGANIZATION.id,
    userId: OWNER.id,
    role: "owner",
  });
  await db.insert(session).values({
    id: "session_e2e_owner",
    token: SESSION_TOKEN,
    userId: OWNER.id,
    activeOrganizationId: ORGANIZATION.id,
    expiresAt: expires,
    updatedAt: new Date(),
  });
  await db.insert(voice).values({
    id: SYSTEM_VOICE.id,
    name: SYSTEM_VOICE.name,
    description: "Soothing and calm",
    variant: "SYSTEM",
    r2ObjectKey: SYSTEM_VOICE_KEY,
  });

  await client.end();
  return { sessionCookie: signedSessionCookie(SESSION_TOKEN), expires };
}

/** The System voice's sample, so its preview plays. scripts/system-voices is not in git. */
export async function uploadSystemVoiceSample(source: NodeJS.ProcessEnv) {
  const r2 = r2Env(source);
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${r2.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2.R2_ACCESS_KEY_ID, secretAccessKey: r2.R2_SECRET_ACCESS_KEY },
  });
  await s3.send(
    new PutObjectCommand({
      Bucket: r2.R2_BUCKET_NAME,
      Key: SYSTEM_VOICE_KEY,
      Body: wavOfSeconds(2),
      ContentType: "audio/wav",
    }),
  );
}
