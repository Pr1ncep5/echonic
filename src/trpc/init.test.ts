import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { member } from "@/db/schema";
import { createMember, createOrganization, createUser } from "@/tests/factories";
import { callerAs, signedOutCaller } from "@/tests/trpc";

describe("who may call Organization procedures", () => {
  it("rejects a caller who is not signed in", async () => {
    const caller = await signedOutCaller();

    await expect(caller.voices.getAll()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a User with no active Organization", async () => {
    const caller = await callerAs(await createUser());

    await expect(caller.voices.getAll()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a session that points at an Organization the User never joined", async () => {
    const org = await createOrganization();
    const caller = await callerAs(await createUser(org.id));

    await expect(caller.voices.getAll()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a removed Member whose session still points at the Organization", async () => {
    const org = await createOrganization();
    const removed = await createMember(org.id);
    await db.delete(member).where(eq(member.userId, removed.user.id));
    const caller = await callerAs(removed);

    await expect(caller.voices.getAll()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets a Member in", async () => {
    const org = await createOrganization();
    const caller = await callerAs(await createMember(org.id));

    await expect(caller.voices.getAll()).resolves.toEqual({ custom: [], system: [] });
  });
});
