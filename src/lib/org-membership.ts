import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { member } from "@/db/schema";
import { auth } from "./auth";

export interface OrgSession {
  readonly userId: string;
  readonly orgId: string;
  readonly role: string;
}

/**
 * The member's role in the Organization, or null when they are not a member.
 * Better Auth stores multiple roles as one comma-separated string.
 */
export async function getMemberRole(userId: string, orgId: string): Promise<string | null> {
  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))
    .limit(1);
  return membership?.role ?? null;
}

/**
 * The session's user and active Organization, only if the user is still a member of it.
 * `activeOrganizationId` alone is not enough: Better Auth only clears it on the remover's
 * own session, so a removed member's sessions keep pointing at the Organization.
 */
export async function getOrgSession(headers: Headers): Promise<OrgSession | null> {
  const sessionData = await auth.api.getSession({ headers });
  const userId = sessionData?.user.id;
  const orgId = sessionData?.session.activeOrganizationId;
  if (!userId || !orgId) {
    return null;
  }

  const role = await getMemberRole(userId, orgId);
  return role ? { userId, orgId, role } : null;
}
