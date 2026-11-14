import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { generation, member, organization, session, user, voice } from "@/db/schema";
import type { MemberRole } from "@/features/organizations/data/member-roles";
import type { TestSession } from "./session";

/** Returns the single row an insert produced, so callers get a non-optional value. */
function only<T>(rows: T[]): T {
  const [row] = rows;
  if (!row) {
    throw new Error("Insert returned no row");
  }
  return row;
}

export async function createOrganization(name = "Acme") {
  const id = createId();
  return only(
    await db
      .insert(organization)
      .values({ id, name, slug: `${name.toLowerCase()}-${id}` })
      .returning(),
  );
}

/** A User without any Organization, signed in with no active Organization. */
export async function createUser(activeOrganizationId: string | null = null): Promise<TestSession> {
  const id = createId();
  const createdUser = only(
    await db
      .insert(user)
      .values({ id, name: "Test User", email: `${id}@example.com`, emailVerified: true })
      .returning(),
  );
  const createdSession = only(
    await db
      .insert(session)
      .values({
        id: createId(),
        token: createId(),
        userId: id,
        activeOrganizationId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        updatedAt: new Date(),
      })
      .returning(),
  );
  return { user: createdUser, session: createdSession };
}

/** A Member of the Organization, with a session whose active Organization is that one. */
export async function createMember(orgId: string, role: MemberRole = "member") {
  const testSession = await createUser(orgId);
  await db
    .insert(member)
    .values({ id: createId(), organizationId: orgId, userId: testSession.user.id, role });
  return testSession;
}

export async function createCustomVoice(
  orgId: string,
  overrides: Partial<typeof voice.$inferInsert> = {},
) {
  const id = createId();
  return only(
    await db
      .insert(voice)
      .values({
        id,
        orgId,
        name: "Custom voice",
        variant: "CUSTOM",
        r2ObjectKey: `voices/orgs/${orgId}/${id}`,
        ...overrides,
      })
      .returning(),
  );
}

export async function createSystemVoice(overrides: Partial<typeof voice.$inferInsert> = {}) {
  const id = createId();
  return only(
    await db
      .insert(voice)
      .values({
        id,
        name: "System voice",
        variant: "SYSTEM",
        r2ObjectKey: `voices/system/${id}`,
        ...overrides,
      })
      .returning(),
  );
}

export async function createGeneration(
  orgId: string,
  overrides: Partial<typeof generation.$inferInsert> = {},
) {
  const id = createId();
  return only(
    await db
      .insert(generation)
      .values({
        id,
        orgId,
        text: "Hello from the tests",
        voiceName: "System voice",
        r2ObjectKey: `generations/orgs/${orgId}/${id}`,
        temperature: 0.8,
        topP: 0.95,
        topK: 1000,
        repetitionPenalty: 1.2,
        ...overrides,
      })
      .returning(),
  );
}
