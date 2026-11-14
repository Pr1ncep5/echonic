import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { generation, voice } from "@/db/schema";
import type { MemberRole } from "@/features/organizations/data/member-roles";
import { givenSubscription } from "@/tests/external";
import {
  createCustomVoice,
  createGeneration,
  createMember,
  createOrganization,
} from "@/tests/factories";
import { callerAs, rejection } from "@/tests/trpc";
import { getAppErrorCode } from "./app-error";

async function callerWithRole(role: MemberRole) {
  const org = await createOrganization();
  const caller = await callerAs(await createMember(org.id, role));
  return { org, caller };
}

describe("only owners and admins delete a Custom voice", () => {
  it("refuses a Member and leaves the Custom voice in place", async () => {
    const { org, caller } = await callerWithRole("member");
    const custom = await createCustomVoice(org.id);

    const error = await rejection(caller.voices.delete({ id: custom.id }));

    expect(error.code).toBe("FORBIDDEN");
    expect(getAppErrorCode(error)).toBe("ROLE_REQUIRED");
    expect(await db.select({ id: voice.id }).from(voice)).toEqual([{ id: custom.id }]);
  });

  it.each(["admin", "owner"] as const)("lets an %s delete it", async (role) => {
    const { org, caller } = await callerWithRole(role);
    const custom = await createCustomVoice(org.id);

    await caller.voices.delete({ id: custom.id });

    expect(await db.select().from(voice)).toEqual([]);
  });
});

describe("only owners and admins manage the Subscription", () => {
  it("refuses a Member who tries to subscribe or open the billing portal", async () => {
    const { caller } = await callerWithRole("member");

    for (const call of [caller.billings.createCheckout(), caller.billings.createPortalSession()]) {
      const error = await rejection(call);
      expect(error.code).toBe("FORBIDDEN");
      expect(getAppErrorCode(error)).toBe("ROLE_REQUIRED");
    }
  });

  it.each(["admin", "owner"] as const)("lets an %s subscribe and open the portal", async (role) => {
    const { caller } = await callerWithRole(role);

    await expect(caller.billings.createCheckout()).resolves.toEqual({
      checkoutUrl: expect.any(String),
    });
    await expect(caller.billings.createPortalSession()).resolves.toEqual({
      portalUrl: expect.any(String),
    });
  });

  it("lets a Member see whether the Organization is subscribed", async () => {
    const { caller } = await callerWithRole("member");
    givenSubscription();

    await expect(caller.billings.getStatus()).resolves.toMatchObject({
      hasActiveSubscription: true,
    });
  });

  it("reports an Organization that never subscribed as not subscribed, not as an error", async () => {
    const { caller } = await callerWithRole("member");

    await expect(caller.billings.getStatus()).resolves.toMatchObject({
      hasActiveSubscription: false,
      customerId: null,
    });
  });
});

describe("any Member deletes a Generation", () => {
  it("lets a Member delete a Generation of the Organization", async () => {
    const { org, caller } = await callerWithRole("member");
    const own = await createGeneration(org.id);

    await caller.generations.delete({ id: own.id });

    expect(await db.select().from(generation)).toEqual([]);
  });
});
