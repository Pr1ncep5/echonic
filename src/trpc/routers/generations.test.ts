import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { generation, outbox } from "@/db/schema";
import { createGeneration, createMember, createOrganization } from "@/tests/factories";
import { callerAs } from "@/tests/trpc";

describe("Generations belong to one Organization", () => {
  it("returns a Generation to a Member of its Organization", async () => {
    const org = await createOrganization();
    const own = await createGeneration(org.id, { text: "Ours" });
    const caller = await callerAs(await createMember(org.id));

    const result = await caller.generations.getById({ id: own.id });

    expect(result).toMatchObject({ id: own.id, text: "Ours", audioUrl: `/api/audio/${own.id}` });
  });

  it("never sends the Organization, storage key or idempotency key to the client", async () => {
    const org = await createOrganization();
    const own = await createGeneration(org.id, { idempotencyKey: crypto.randomUUID() });
    const caller = await callerAs(await createMember(org.id));

    const result = await caller.generations.getById({ id: own.id });

    expect(result).not.toHaveProperty("orgId");
    expect(result).not.toHaveProperty("r2ObjectKey");
    expect(result).not.toHaveProperty("idempotencyKey");
  });

  it("hides another Organization's Generation", async () => {
    const [ours, theirs] = [await createOrganization("Ours"), await createOrganization("Theirs")];
    const foreign = await createGeneration(theirs.id);
    const caller = await callerAs(await createMember(ours.id));

    await expect(caller.generations.getById({ id: foreign.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("lists only the Organization's own history", async () => {
    const [ours, theirs] = [await createOrganization("Ours"), await createOrganization("Theirs")];
    const own = await createGeneration(ours.id);
    await createGeneration(theirs.id);
    const caller = await callerAs(await createMember(ours.id));

    const { items } = await caller.generations.list({});

    expect(items.map((item) => item.id)).toEqual([own.id]);
  });

  it("refuses to delete another Organization's Generation and leaves it in place", async () => {
    const [ours, theirs] = [await createOrganization("Ours"), await createOrganization("Theirs")];
    const foreign = await createGeneration(theirs.id);
    const caller = await callerAs(await createMember(ours.id));

    await expect(caller.generations.delete({ id: foreign.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    expect(await db.select({ id: generation.id }).from(generation)).toEqual([{ id: foreign.id }]);
    expect(await db.select().from(outbox)).toEqual([]);
  });

  it("deletes the Organization's own Generation and queues the removal of its audio", async () => {
    const org = await createOrganization();
    const own = await createGeneration(org.id);
    const caller = await callerAs(await createMember(org.id));

    await caller.generations.delete({ id: own.id });

    expect(await db.select().from(generation)).toEqual([]);
    expect(await db.select().from(outbox)).toMatchObject([
      { kind: "R2_DELETE", payload: { key: own.r2ObjectKey } },
    ]);
  });
});
