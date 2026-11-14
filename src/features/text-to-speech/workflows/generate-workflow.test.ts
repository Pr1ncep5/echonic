import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { generation } from "@/db/schema";
import { StorageUploadError, uploadAudio } from "@/lib/r2";
import {
  chatterboxPost,
  givenChatterboxFails,
  givenPolarOutage,
  givenSubscription,
} from "@/tests/external";
import {
  createCustomVoice,
  createGeneration,
  createMember,
  createOrganization,
  createSystemVoice,
} from "@/tests/factories";
import { queuedTasks } from "@/tests/outbox";
import { callerAs, rejection } from "@/tests/trpc";
import { getAppErrorCode } from "@/trpc/app-error";
import { GENERATIONS_PER_MINUTE } from "../data/constants";

/** A Member of a new Organization, a System voice, and a way to submit the form. */
async function setUp() {
  const org = await createOrganization();
  const systemVoice = await createSystemVoice();
  const caller = await callerAs(await createMember(org.id));
  const generate = (overrides: { text?: string; voiceId?: string; idempotencyKey?: string } = {}) =>
    caller.generations.create({
      text: "Hello world",
      voiceId: systemVoice.id,
      idempotencyKey: crypto.randomUUID(),
      ...overrides,
    });
  return { org, systemVoice, generate };
}

function storedGenerations() {
  return db.select().from(generation);
}

describe("generating speech requires a Subscription", () => {
  it("refuses without a Subscription, and does no work and bills nothing", async () => {
    const { generate } = await setUp();

    const error = await rejection(generate());

    expect(error.code).toBe("FORBIDDEN");
    expect(getAppErrorCode(error)).toBe("SUBSCRIPTION_REQUIRED");
    expect(chatterboxPost).not.toHaveBeenCalled();
    expect(uploadAudio).not.toHaveBeenCalled();
    expect(await storedGenerations()).toEqual([]);
    expect(await queuedTasks()).toEqual([]);
  });

  it("reports a Polar outage as a failure, not as a missing Subscription", async () => {
    const { generate } = await setUp();
    givenPolarOutage();

    const error = await rejection(generate());

    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(getAppErrorCode(error)).toBeNull();
    expect(chatterboxPost).not.toHaveBeenCalled();
    expect(await storedGenerations()).toEqual([]);
    expect(await queuedTasks()).toEqual([]);
  });
});

describe("a Generation is billed exactly once", () => {
  it("stores the Generation and queues one Usage event for its characters", async () => {
    const { org, systemVoice, generate } = await setUp();
    givenSubscription();

    const { id } = await generate({ text: "Hello world" });

    expect(await storedGenerations()).toMatchObject([
      {
        id,
        orgId: org.id,
        text: "Hello world",
        voiceId: systemVoice.id,
        r2ObjectKey: `generations/orgs/${org.id}/${id}`,
      },
    ]);
    // Only the Usage event is left: the upload's cleanup task was cancelled.
    expect(await queuedTasks()).toMatchObject([
      {
        kind: "USAGE_EVENT",
        payload: {
          orgId: org.id,
          name: "tts_generation",
          externalId: id,
          metadata: { characters: "Hello world".length },
        },
      },
    ]);
  });

  it("returns the first Generation when the same submit is retried", async () => {
    const { generate } = await setUp();
    givenSubscription();
    const idempotencyKey = crypto.randomUUID();

    const first = await generate({ idempotencyKey });
    const retry = await generate({ idempotencyKey });

    expect(retry.id).toBe(first.id);
    expect(chatterboxPost).toHaveBeenCalledTimes(1);
    expect(await storedGenerations()).toHaveLength(1);
    expect(await queuedTasks()).toHaveLength(1);
  });

  it("returns the first Generation for a reused key even if the text differs", async () => {
    const { generate } = await setUp();
    givenSubscription();
    const idempotencyKey = crypto.randomUUID();

    const first = await generate({ idempotencyKey, text: "First text" });
    const second = await generate({ idempotencyKey, text: "Different text" });

    expect(second.id).toBe(first.id);
    expect(await storedGenerations()).toMatchObject([{ text: "First text" }]);
  });

  it("makes and bills a new take when the same text is submitted again on purpose", async () => {
    const { generate } = await setUp();
    givenSubscription();

    const first = await generate({ text: "Same text" });
    const second = await generate({ text: "Same text" });

    expect(second.id).not.toBe(first.id);
    expect(await storedGenerations()).toHaveLength(2);
    expect((await queuedTasks()).map((task) => task.kind)).toEqual(["USAGE_EVENT", "USAGE_EVENT"]);
  });

  it("bills once when two identical submits arrive at the same time", async () => {
    const { generate } = await setUp();
    givenSubscription();
    const idempotencyKey = crypto.randomUUID();

    const [first, second] = await Promise.all([
      generate({ idempotencyKey }),
      generate({ idempotencyKey }),
    ]);

    expect(second.id).toBe(first.id);
    expect(await storedGenerations()).toHaveLength(1);
    const tasks = await queuedTasks();
    expect(tasks.filter((task) => task.kind === "USAGE_EVENT")).toHaveLength(1);
  });

  it("keeps idempotency keys apart between Organizations", async () => {
    const { generate, systemVoice } = await setUp();
    givenSubscription();
    const idempotencyKey = crypto.randomUUID();
    const first = await generate({ idempotencyKey });

    const otherOrg = await createOrganization("Other");
    const otherCaller = await callerAs(await createMember(otherOrg.id));
    const second = await otherCaller.generations.create({
      text: "Hello world",
      voiceId: systemVoice.id,
      idempotencyKey,
    });

    expect(second.id).not.toBe(first.id);
    expect(await storedGenerations()).toHaveLength(2);
  });
});

describe("a failed Generation is not billed and leaves nothing behind", () => {
  it("stores and bills nothing when Chatterbox fails", async () => {
    const { generate } = await setUp();
    givenSubscription();
    givenChatterboxFails(400);

    const error = await rejection(generate());

    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    // The upstream response must not leak to the user.
    expect(error.message).not.toContain("Chatterbox failed");
    expect(uploadAudio).not.toHaveBeenCalled();
    expect(await storedGenerations()).toEqual([]);
    expect(await queuedTasks()).toEqual([]);
  });

  it("bills nothing when the upload fails, and leaves the audio's cleanup queued", async () => {
    const { org, generate } = await setUp();
    givenSubscription();
    vi.mocked(uploadAudio).mockReturnValueOnce(
      Effect.fail(new StorageUploadError({ key: "any", cause: "R2 is down" })),
    );

    const error = await rejection(generate());

    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(await storedGenerations()).toEqual([]);
    const tasks = await queuedTasks();
    expect(tasks).toMatchObject([{ kind: "R2_DELETE" }]);
    expect(tasks[0]?.payload).toMatchObject({
      key: expect.stringContaining(`generations/orgs/${org.id}/`),
    });
    // Delayed, so it can never delete the audio of a request that is still running.
    expect(tasks[0]?.availableAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("which Voices an Organization may generate with", () => {
  it("accepts the Organization's own Custom voice", async () => {
    const { org, generate } = await setUp();
    givenSubscription();
    const custom = await createCustomVoice(org.id);

    await expect(generate({ voiceId: custom.id })).resolves.toEqual({ id: expect.any(String) });
  });

  it("refuses another Organization's Custom voice and bills nothing", async () => {
    const { generate } = await setUp();
    givenSubscription();
    const otherOrg = await createOrganization("Other");
    const foreign = await createCustomVoice(otherOrg.id);

    const error = await rejection(generate({ voiceId: foreign.id }));

    expect(error.code).toBe("NOT_FOUND");
    expect(chatterboxPost).not.toHaveBeenCalled();
    expect(await storedGenerations()).toEqual([]);
    expect(await queuedTasks()).toEqual([]);
  });
});

describe("an Organization's Generations per minute are limited", () => {
  async function createRecentGenerations(orgId: string, createdAt: Date) {
    for (let index = 0; index < GENERATIONS_PER_MINUTE; index += 1) {
      await createGeneration(orgId, { createdAt });
    }
  }

  it("refuses the next Generation once the limit is reached, without doing the work", async () => {
    const { org, generate } = await setUp();
    givenSubscription();
    await createRecentGenerations(org.id, new Date());

    const error = await rejection(generate());

    expect(error.code).toBe("TOO_MANY_REQUESTS");
    expect(getAppErrorCode(error)).toBe("RATE_LIMITED");
    expect(chatterboxPost).not.toHaveBeenCalled();
    expect(await queuedTasks()).toEqual([]);
  });

  it("does not count Generations older than a minute", async () => {
    const { org, generate } = await setUp();
    givenSubscription();
    await createRecentGenerations(org.id, new Date(Date.now() - 2 * 60_000));

    await expect(generate()).resolves.toEqual({ id: expect.any(String) });
  });

  it("does not count another Organization's Generations", async () => {
    const { generate } = await setUp();
    givenSubscription();
    const otherOrg = await createOrganization("Other");
    await createRecentGenerations(otherOrg.id, new Date());

    await expect(generate()).resolves.toEqual({ id: expect.any(String) });
  });

  it("still returns an earlier Generation for a retried submit while limited", async () => {
    const { org, generate } = await setUp();
    givenSubscription();
    const idempotencyKey = crypto.randomUUID();
    const first = await generate({ idempotencyKey });
    await createRecentGenerations(org.id, new Date());

    await expect(generate({ idempotencyKey })).resolves.toEqual({ id: first.id });
  });
});
