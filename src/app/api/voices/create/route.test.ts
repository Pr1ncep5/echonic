import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { voice } from "@/db/schema";
import { env } from "@/lib/env";
import { StorageUploadError, uploadAudio } from "@/lib/r2";
import { wavOfSeconds } from "@/tests/audio";
import { givenPolarOutage, givenSubscription } from "@/tests/external";
import { createMember, createOrganization } from "@/tests/factories";
import { queuedTasks } from "@/tests/outbox";
import { signInAs } from "@/tests/session";
import { POST } from "./route";

const validParams = {
  name: "Narrator",
  category: "GENERAL",
  language: "en-US",
  consent: "true",
};

function cloneVoice({
  params = validParams,
  contentType = "audio/wav",
  audio = wavOfSeconds(11),
}: {
  params?: Record<string, string>;
  contentType?: string;
  audio?: Buffer;
} = {}) {
  const url = new URL("/api/voices/create", env.APP_URL);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  return POST(
    new Request(url, {
      method: "POST",
      headers: { "content-type": contentType },
      body: new Uint8Array(audio),
    }),
  );
}

/** A Member of a new Organization, signed in. */
async function setUp() {
  const org = await createOrganization();
  const member = await createMember(org.id);
  signInAs(member);
  return { org, member };
}

function storedVoices() {
  return db.select().from(voice);
}

describe("POST /api/voices/create", () => {
  it("rejects a caller who is not signed in", async () => {
    givenSubscription();

    expect((await cloneVoice()).status).toBe(401);
    expect(await storedVoices()).toEqual([]);
  });

  describe("Voice cloning requires a Subscription", () => {
    it("refuses without a Subscription, and stores and bills nothing", async () => {
      await setUp();

      const response = await cloneVoice();

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: "SUBSCRIPTION_REQUIRED" });
      expect(uploadAudio).not.toHaveBeenCalled();
      expect(await storedVoices()).toEqual([]);
      expect(await queuedTasks()).toEqual([]);
    });

    it("answers SUBSCRIPTION_REQUIRED before looking at the input", async () => {
      await setUp();

      const response = await cloneVoice({ params: {}, contentType: "text/html" });

      expect(response.status).toBe(403);
    });

    it("reports a Polar outage as a failure, not as a missing Subscription", async () => {
      await setUp();
      givenPolarOutage();

      const response = await cloneVoice();

      expect(response.status).toBe(502);
      expect(await response.json()).not.toHaveProperty("code");
      expect(await storedVoices()).toEqual([]);
      expect(await queuedTasks()).toEqual([]);
    });
  });

  describe("a Custom voice is billed exactly once", () => {
    it("stores the Custom voice for the Organization and queues one Usage event", async () => {
      const { org } = await setUp();
      givenSubscription();

      const response = await cloneVoice();

      expect(response.status).toBe(201);
      const [created] = await storedVoices();
      expect(created).toMatchObject({
        name: "Narrator",
        variant: "CUSTOM",
        orgId: org.id,
        r2ObjectKey: `voices/orgs/${org.id}/${created?.id}`,
      });
      // Only the Usage event is left: the upload's cleanup task was cancelled.
      expect(await queuedTasks()).toMatchObject([
        {
          kind: "USAGE_EVENT",
          payload: { orgId: org.id, name: "voice_creation", externalId: created?.id },
        },
      ]);
    });

    it("bills nothing when the upload fails, and leaves the audio's cleanup queued", async () => {
      const { org } = await setUp();
      givenSubscription();
      vi.mocked(uploadAudio).mockReturnValueOnce(
        Effect.fail(new StorageUploadError({ key: "any", cause: "R2 is down" })),
      );

      const response = await cloneVoice();

      expect(response.status).toBe(500);
      expect(await storedVoices()).toEqual([]);
      const tasks = await queuedTasks();
      expect(tasks).toMatchObject([{ kind: "R2_DELETE" }]);
      expect(tasks[0]?.payload).toMatchObject({
        key: expect.stringContaining(`voices/orgs/${org.id}/`),
      });
    });
  });

  describe("consent", () => {
    it("records who confirmed the right to clone the voice, and when", async () => {
      const { member } = await setUp();
      givenSubscription();

      await cloneVoice();

      const [created] = await storedVoices();
      expect(created?.consentedByUserId).toBe(member.user.id);
      expect(created?.consentedAt).toBeInstanceOf(Date);
    });

    it("refuses without consent, and stores and bills nothing", async () => {
      await setUp();
      givenSubscription();
      const { consent: _consent, ...withoutConsent } = validParams;

      const response = await cloneVoice({ params: withoutConsent });

      expect(response.status).toBe(400);
      expect(uploadAudio).not.toHaveBeenCalled();
      expect(await storedVoices()).toEqual([]);
      expect(await queuedTasks()).toEqual([]);
    });
  });

  describe("the Organization comes from the session only", () => {
    it("ignores an Organization named in the request", async () => {
      const { org } = await setUp();
      givenSubscription();
      const otherOrg = await createOrganization("Other");

      await cloneVoice({ params: { ...validParams, orgId: otherOrg.id } });

      expect(await storedVoices()).toMatchObject([{ orgId: org.id }]);
    });
  });

  describe("the audio sample", () => {
    it("refuses a sample that is too short, and stores and bills nothing", async () => {
      await setUp();
      givenSubscription();

      const response = await cloneVoice({ audio: wavOfSeconds(2) });

      expect(response.status).toBe(422);
      expect(uploadAudio).not.toHaveBeenCalled();
      expect(await storedVoices()).toEqual([]);
      expect(await queuedTasks()).toEqual([]);
    });

    it("refuses a type that is not audio, so an upload can never be served as a page", async () => {
      await setUp();
      givenSubscription();

      const response = await cloneVoice({ contentType: "text/html" });

      expect(response.status).toBe(415);
      expect(await storedVoices()).toEqual([]);
    });

    it("refuses a file that is not audio whatever its declared type", async () => {
      await setUp();
      givenSubscription();

      const response = await cloneVoice({ audio: Buffer.from("<html>not audio</html>") });

      expect(response.status).toBe(422);
      expect(await storedVoices()).toEqual([]);
    });
  });
});
