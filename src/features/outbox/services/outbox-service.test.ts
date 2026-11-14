import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { outbox } from "@/db/schema";
import { deleteAudio, deleteAudioByPrefix } from "@/lib/r2";
import { givenSubscription, polarIngest } from "@/tests/external";
import { createMember, createOrganization, createSystemVoice } from "@/tests/factories";
import { queuedTasks, queueTask, usageEvent } from "@/tests/outbox";
import { callerAs } from "@/tests/trpc";
import { drainOutbox } from "./outbox-service";

function drain() {
  return Effect.runPromise(drainOutbox());
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function minutesFromNow(date: Date) {
  return (date.getTime() - Date.now()) / MINUTE;
}

describe("draining the outbox performs each side effect and removes its task", () => {
  it("reports a Usage event to Polar for the Organization", async () => {
    await queueTask(usageEvent("org_1", "generation_1"));

    const result = await drain();

    expect(result).toEqual({ processed: 1, failed: 0 });
    expect(polarIngest).toHaveBeenCalledExactlyOnceWith({
      events: [
        {
          name: "tts_generation",
          // Polar deduplicates on this, so a repeated delivery cannot bill twice.
          external_id: "generation_1",
          external_customer_id: "org_1",
          metadata: { characters: 11 },
          // When the work happened, not when it was delivered.
          timestamp: "2026-11-14T10:00:00.000Z",
        },
      ],
    });
    expect(await queuedTasks()).toEqual([]);
  });

  it("deletes one stored audio object", async () => {
    await queueTask({ kind: "R2_DELETE", payload: { key: "generations/orgs/org_1/gen_1" } });

    await drain();

    expect(deleteAudio).toHaveBeenCalledExactlyOnceWith("generations/orgs/org_1/gen_1");
    expect(await queuedTasks()).toEqual([]);
  });

  it("deletes everything under a prefix", async () => {
    await queueTask({ kind: "R2_DELETE_PREFIX", payload: { prefix: "voices/orgs/org_1/" } });

    await drain();

    expect(deleteAudioByPrefix).toHaveBeenCalledExactlyOnceWith("voices/orgs/org_1/");
    expect(await queuedTasks()).toEqual([]);
  });

  it("leaves a task that is not due yet", async () => {
    await queueTask(
      { kind: "R2_DELETE", payload: { key: "generations/orgs/org_1/in-flight" } },
      { availableAt: new Date(Date.now() + 30 * MINUTE) },
    );

    const result = await drain();

    expect(result).toEqual({ processed: 0, failed: 0 });
    expect(deleteAudio).not.toHaveBeenCalled();
    expect(await queuedTasks()).toHaveLength(1);
  });
});

describe("a side effect that fails is kept and retried later", () => {
  it("keeps the task, counts the attempt and waits a minute before the next try", async () => {
    polarIngest.mockRejectedValueOnce(new Error("Polar is unavailable"));
    await queueTask(usageEvent("org_1", "generation_1"));

    const result = await drain();

    expect(result).toEqual({ processed: 0, failed: 1 });
    const [task] = await queuedTasks();
    expect(task).toMatchObject({ kind: "USAGE_EVENT", attempts: 1 });
    expect(minutesFromNow(task.availableAt)).toBeCloseTo(1, 0);
  });

  it("is not retried before its wait is over, and succeeds once Polar is back", async () => {
    polarIngest.mockRejectedValueOnce(new Error("Polar is unavailable"));
    await queueTask(usageEvent("org_1", "generation_1"));
    await drain();

    expect(await drain()).toEqual({ processed: 0, failed: 0 });

    await db.update(outbox).set({ availableAt: new Date() });
    expect(await drain()).toEqual({ processed: 1, failed: 0 });
    expect(polarIngest).toHaveBeenCalledTimes(2);
    expect(await queuedTasks()).toEqual([]);
  });

  it("doubles the wait with every failed attempt", async () => {
    polarIngest.mockRejectedValueOnce(new Error("Polar is unavailable"));
    await queueTask(usageEvent("org_1", "generation_1"), { attempts: 3 });

    await drain();

    const [task] = await queuedTasks();
    expect(task.attempts).toBe(4);
    expect(minutesFromNow(task.availableAt)).toBeCloseTo(8, 0);
  });

  it("never waits longer than six hours", async () => {
    polarIngest.mockRejectedValueOnce(new Error("Polar is unavailable"));
    await queueTask(usageEvent("org_1", "generation_1"), { attempts: 30 });

    await drain();

    const [task] = await queuedTasks();
    expect(task.availableAt.getTime() - Date.now()).toBeLessThanOrEqual(6 * HOUR);
    expect(task.availableAt.getTime() - Date.now()).toBeGreaterThan(5 * HOUR);
  });

  it("does not let one failing task hold back the others", async () => {
    vi.mocked(deleteAudio).mockRejectedValueOnce(new Error("R2 is unavailable"));
    await queueTask({ kind: "R2_DELETE", payload: { key: "generations/orgs/org_1/gen_1" } });
    await queueTask(usageEvent("org_1", "generation_1"));

    const result = await drain();

    expect(result).toEqual({ processed: 1, failed: 1 });
    expect(polarIngest).toHaveBeenCalledTimes(1);
    expect(await queuedTasks()).toMatchObject([{ kind: "R2_DELETE", attempts: 1 }]);
  });

  it("keeps a task it cannot understand instead of dropping it", async () => {
    await db.insert(outbox).values({ kind: "USAGE_EVENT", payload: { unexpected: true } });

    const result = await drain();

    expect(result).toEqual({ processed: 0, failed: 1 });
    expect(polarIngest).not.toHaveBeenCalled();
    expect(await queuedTasks()).toMatchObject([{ attempts: 1 }]);
  });
});

describe("from the work to Polar", () => {
  it("reports a Generation's usage once, however often the outbox is drained", async () => {
    const org = await createOrganization();
    const systemVoice = await createSystemVoice();
    const caller = await callerAs(await createMember(org.id));
    givenSubscription();
    const { id } = await caller.generations.create({
      text: "Hello world",
      voiceId: systemVoice.id,
      idempotencyKey: crypto.randomUUID(),
    });

    await drain();
    await drain();

    expect(polarIngest).toHaveBeenCalledExactlyOnceWith({
      events: [
        expect.objectContaining({
          name: "tts_generation",
          external_id: id,
          external_customer_id: org.id,
          metadata: { characters: 11 },
        }),
      ],
    });
  });

  it("removes a deleted Generation's audio from storage", async () => {
    const org = await createOrganization();
    const systemVoice = await createSystemVoice();
    const caller = await callerAs(await createMember(org.id));
    givenSubscription();
    const { id } = await caller.generations.create({
      text: "Hello world",
      voiceId: systemVoice.id,
      idempotencyKey: crypto.randomUUID(),
    });
    await caller.generations.delete({ id });

    await drain();

    expect(deleteAudio).toHaveBeenCalledExactlyOnceWith(`generations/orgs/${org.id}/${id}`);
    expect(await queuedTasks()).toEqual([]);
  });
});
