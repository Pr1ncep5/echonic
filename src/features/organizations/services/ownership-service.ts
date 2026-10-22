import { Effect } from "effect";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { member, organization } from "@/db/schema";
import { DatabaseError } from "@/db/errors";
import { hasRole } from "../data/member-roles";

export interface SoleOwnedOrganization {
  readonly id: string;
  readonly name: string;
}

/**
 * Organizations where the user is the only owner. Deleting such a user would leave the
 * Organization, and its Subscription, with nobody able to manage or delete it.
 */
export function findSoleOwnedOrganizations(
  userId: string,
): Effect.Effect<SoleOwnedOrganization[], DatabaseError> {
  return Effect.gen(function* () {
    const memberships = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ organizationId: member.organizationId })
          .from(member)
          .where(eq(member.userId, userId)),
      catch: (cause) => new DatabaseError({ operation: "select", entity: "member", cause }),
    });
    if (memberships.length === 0) return [];

    const organizationIds = memberships.map((membership) => membership.organizationId);
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            organizationId: member.organizationId,
            organizationName: organization.name,
            userId: member.userId,
            role: member.role,
          })
          .from(member)
          .innerJoin(organization, eq(organization.id, member.organizationId))
          .where(inArray(member.organizationId, organizationIds)),
      catch: (cause) => new DatabaseError({ operation: "select", entity: "member", cause }),
    });

    const owners = rows.filter((row) => hasRole(row.role, "owner"));
    return organizationIds.flatMap((organizationId) => {
      const orgOwners = owners.filter((owner) => owner.organizationId === organizationId);
      const isSoleOwner = orgOwners.length === 1 && orgOwners[0].userId === userId;
      return isSoleOwner ? [{ id: organizationId, name: orgOwners[0].organizationName }] : [];
    });
  });
}
