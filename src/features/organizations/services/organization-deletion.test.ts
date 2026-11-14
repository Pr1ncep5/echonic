import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { organization } from "@/db/schema";
import { BillingServiceError } from "@/features/billing/domain/errors";
import { revokeSubscriptions } from "@/features/billing/services/subscription-service";
import { deleteAudioByPrefix } from "@/lib/r2";
import { givenPolarOutage, givenSubscription, polarRevoke } from "@/tests/external";
import {
  createCustomVoice,
  createGeneration,
  createMember,
  createOrganization,
} from "@/tests/factories";
import { queuedTasks } from "@/tests/outbox";
import { drainOutbox } from "@/features/outbox/services/outbox-service";
import { queueOrganizationAudioDeletion } from "./organization-deletion-service";
import { findSoleOwnedOrganizations } from "./ownership-service";

// These are the steps lib/auth.ts runs around Better Auth's own deletion of the row.

describe("deleting an Organization ends its Subscription first", () => {
  it("revokes the active Subscription", async () => {
    givenSubscription();

    await Effect.runPromise(revokeSubscriptions("org_1"));

    expect(polarRevoke).toHaveBeenCalledExactlyOnceWith("sub_test");
  });

  it("has nothing to revoke for an Organization that never subscribed", async () => {
    await Effect.runPromise(revokeSubscriptions("org_1"));

    expect(polarRevoke).not.toHaveBeenCalled();
  });

  it("fails when Polar cannot be reached, so the deletion is refused", async () => {
    givenPolarOutage();

    const error = await Effect.runPromise(Effect.flip(revokeSubscriptions("org_1")));

    expect(error).toBeInstanceOf(BillingServiceError);
  });

  it("fails when the Subscription cannot be revoked, so the deletion is refused", async () => {
    givenSubscription();
    polarRevoke.mockRejectedValueOnce(new Error("Polar is unavailable"));

    const error = await Effect.runPromise(Effect.flip(revokeSubscriptions("org_1")));

    expect(error).toBeInstanceOf(BillingServiceError);
  });
});

describe("a deleted Organization leaves no audio behind", () => {
  it("removes all its Voice and Generation audio by prefix once it is gone", async () => {
    const org = await createOrganization();
    await createCustomVoice(org.id);
    await createGeneration(org.id);

    await db.delete(organization).where(eq(organization.id, org.id));
    await Effect.runPromise(queueOrganizationAudioDeletion(org.id));
    await Effect.runPromise(drainOutbox());

    const deletedPrefixes = vi.mocked(deleteAudioByPrefix).mock.calls.map(([prefix]) => prefix);
    expect(deletedPrefixes.toSorted()).toEqual([
      `generations/orgs/${org.id}/`,
      `voices/orgs/${org.id}/`,
    ]);
    expect(await queuedTasks()).toEqual([]);
  });
});

describe("an Organization is never left without an owner", () => {
  function soleOwned(userId: string) {
    return Effect.runPromise(findSoleOwnedOrganizations(userId));
  }

  it("names the Organizations whose only owner is this User", async () => {
    const org = await createOrganization("Acme");
    const owner = await createMember(org.id, "owner");
    await createMember(org.id, "admin");

    expect(await soleOwned(owner.user.id)).toEqual([{ id: org.id, name: "Acme" }]);
  });

  it("names none when another owner remains", async () => {
    const org = await createOrganization();
    const owner = await createMember(org.id, "owner");
    await createMember(org.id, "owner");

    expect(await soleOwned(owner.user.id)).toEqual([]);
  });

  it("names none for a User who owns nothing", async () => {
    const org = await createOrganization();
    await createMember(org.id, "owner");
    const admin = await createMember(org.id, "admin");

    expect(await soleOwned(admin.user.id)).toEqual([]);
  });
});
