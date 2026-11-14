import { asc } from "drizzle-orm";

import { db } from "@/db";
import { outbox } from "@/db/schema";
import type { OutboxTask } from "@/features/outbox/domain/tasks";
import { outboxValues } from "@/features/outbox/services/outbox-service";

/** Every side effect still waiting in the outbox, oldest first. */
export function queuedTasks() {
  return db
    .select({
      kind: outbox.kind,
      payload: outbox.payload,
      attempts: outbox.attempts,
      availableAt: outbox.availableAt,
    })
    .from(outbox)
    .orderBy(asc(outbox.createdAt), asc(outbox.id));
}

/** Puts a task in the outbox, due now unless `availableAt` says otherwise. */
export async function queueTask(
  task: OutboxTask,
  overrides: { availableAt?: Date; attempts?: number } = {},
) {
  await db.insert(outbox).values({ ...outboxValues(task), ...overrides });
}

export function usageEvent(orgId: string, externalId: string): OutboxTask {
  return {
    kind: "USAGE_EVENT",
    payload: {
      orgId,
      name: "tts_generation",
      externalId,
      metadata: { characters: 11 },
      occurredAt: "2026-11-14T10:00:00.000Z",
    },
  };
}
