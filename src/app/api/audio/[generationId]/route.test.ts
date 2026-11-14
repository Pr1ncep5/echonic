import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import type { storedAudioResponse } from "@/lib/stored-audio-response";
import { db } from "@/db";
import { member } from "@/db/schema";
import { env } from "@/lib/env";
import { createGeneration, createMember, createOrganization } from "@/tests/factories";
import { signInAs } from "@/tests/session";
import { GET } from "./route";

// Fetching the bytes from R2 is not what these tests are about: who gets that far is.
vi.mock("@/lib/stored-audio-response", () => ({
  storedAudioResponse: vi.fn<typeof storedAudioResponse>(async () => new Response("audio")),
}));

function getAudio(generationId: string) {
  return GET(new Request(`${env.APP_URL}/api/audio/${generationId}`), {
    params: Promise.resolve({ generationId }),
  });
}

describe("GET /api/audio/[generationId]", () => {
  it("rejects a caller who is not signed in", async () => {
    const org = await createOrganization();
    const own = await createGeneration(org.id);

    expect((await getAudio(own.id)).status).toBe(401);
  });

  it("serves a Generation's audio to a Member of its Organization", async () => {
    const org = await createOrganization();
    const own = await createGeneration(org.id);
    signInAs(await createMember(org.id));

    const response = await getAudio(own.id);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("audio");
  });

  it("hides another Organization's audio", async () => {
    const [ours, theirs] = [await createOrganization("Ours"), await createOrganization("Theirs")];
    const foreign = await createGeneration(theirs.id);
    signInAs(await createMember(ours.id));

    expect((await getAudio(foreign.id)).status).toBe(404);
  });

  it("rejects a removed Member whose session still points at the Organization", async () => {
    const org = await createOrganization();
    const own = await createGeneration(org.id);
    const removed = await createMember(org.id);
    await db.delete(member).where(eq(member.userId, removed.user.id));
    signInAs(removed);

    expect((await getAudio(own.id)).status).toBe(401);
  });
});
