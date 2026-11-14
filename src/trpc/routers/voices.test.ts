import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { outbox, voice } from "@/db/schema";
import {
  createCustomVoice,
  createMember,
  createOrganization,
  createSystemVoice,
} from "@/tests/factories";
import { callerAs } from "@/tests/trpc";

describe("Custom voices belong to one Organization; System voices to none", () => {
  it("lists the Organization's Custom voices together with the System voices", async () => {
    const org = await createOrganization();
    const custom = await createCustomVoice(org.id);
    const system = await createSystemVoice();
    const caller = await callerAs(await createMember(org.id));

    const result = await caller.voices.getAll();

    expect(result.custom.map((v) => v.id)).toEqual([custom.id]);
    expect(result.system.map((v) => v.id)).toEqual([system.id]);
  });

  it("hides another Organization's Custom voices", async () => {
    const [ours, theirs] = [await createOrganization("Ours"), await createOrganization("Theirs")];
    await createCustomVoice(theirs.id, { name: "Their voice" });
    const caller = await callerAs(await createMember(ours.id));

    const result = await caller.voices.getAll();

    expect(result.custom).toEqual([]);
  });

  it("does not find another Organization's Custom voice by searching for its name", async () => {
    const [ours, theirs] = [await createOrganization("Ours"), await createOrganization("Theirs")];
    await createCustomVoice(theirs.id, { name: "Narrator" });
    const caller = await callerAs(await createMember(ours.id));

    const result = await caller.voices.getAll({ query: "Narrator" });

    expect(result.custom).toEqual([]);
  });

  it("shows every System voice to every Organization", async () => {
    const [first, second] = [await createOrganization("First"), await createOrganization("Second")];
    const system = await createSystemVoice();

    for (const org of [first, second]) {
      const caller = await callerAs(await createMember(org.id));
      const result = await caller.voices.getAll();
      expect(result.system.map((v) => v.id)).toEqual([system.id]);
    }
  });

  it("refuses to delete another Organization's Custom voice and leaves it in place", async () => {
    const [ours, theirs] = [await createOrganization("Ours"), await createOrganization("Theirs")];
    const foreign = await createCustomVoice(theirs.id);
    const caller = await callerAs(await createMember(ours.id, "owner"));

    await expect(caller.voices.delete({ id: foreign.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    expect(await db.select({ id: voice.id }).from(voice)).toEqual([{ id: foreign.id }]);
    expect(await db.select().from(outbox)).toEqual([]);
  });

  it("refuses to delete a System voice, even for an owner", async () => {
    const org = await createOrganization();
    const system = await createSystemVoice();
    const caller = await callerAs(await createMember(org.id, "owner"));

    await expect(caller.voices.delete({ id: system.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    expect(await db.select({ id: voice.id }).from(voice)).toEqual([{ id: system.id }]);
  });

  it("deletes the Organization's own Custom voice and queues the removal of its audio", async () => {
    const org = await createOrganization();
    const custom = await createCustomVoice(org.id);
    const caller = await callerAs(await createMember(org.id, "owner"));

    await caller.voices.delete({ id: custom.id });

    expect(await db.select().from(voice)).toEqual([]);
    expect(await db.select().from(outbox)).toMatchObject([
      { kind: "R2_DELETE", payload: { key: custom.r2ObjectKey } },
    ]);
  });
});

describe("searching Voices", () => {
  async function search(query: string) {
    const org = await createOrganization();
    await createSystemVoice({ name: "Narrator", description: "Calm and warm" });
    await createSystemVoice({ name: "100% Real" });
    await createSystemVoice({ name: "snake_case" });
    const caller = await callerAs(await createMember(org.id));
    const result = await caller.voices.getAll({ query });
    return result.system.map((v) => v.name);
  }

  it("matches part of a name, ignoring case", async () => {
    expect(await search("narr")).toEqual(["Narrator"]);
  });

  it("matches the description too", async () => {
    expect(await search("warm")).toEqual(["Narrator"]);
  });

  it("treats % as a literal character, not as a wildcard that matches everything", async () => {
    expect(await search("%")).toEqual(["100% Real"]);
  });

  it("treats _ as a literal character, not as any single character", async () => {
    expect(await search("e_c")).toEqual(["snake_case"]);
  });
});
