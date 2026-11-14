import { Effect } from "effect";
import { after } from "next/server";
import { asc, eq, inArray, lte, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import * as Sentry from "@sentry/nextjs";

import { db } from "@/db";
import { outbox } from "@/db/schema";
import { DatabaseError } from "@/db/errors";
import { deleteAudio, deleteAudioByPrefix } from "@/lib/r2";
import { polar } from "@/lib/polar";
import { outboxTaskSchema, type OutboxTask } from "../domain/tasks";

type OutboxRow = typeof outbox.$inferSelect;

/**
 * How long an upload's cleanup task waits before it may run. Must be longer than the
 * longest request that uploads audio, so cleanup never races a request still in flight.
 */
const UPLOAD_CLEANUP_DELAY_MS = 30 * 60 * 1000;
const MAX_BACKOFF_MS = 6 * 60 * 60 * 1000;
const DRAIN_BATCH_SIZE = 50;

/**
 * Values for an outbox row. Insert them in the same transaction as the change that causes
 * the side effect, so the two can never disagree.
 */
export function outboxValues(task: OutboxTask, options?: { readonly delayMs?: number }) {
  return {
    id: createId(),
    kind: task.kind,
    payload: task.payload,
    availableAt: new Date(Date.now() + (options?.delayMs ?? 0)),
  };
}

/**
 * Queues the deletion of an object that is about to be uploaded, and returns the task id.
 * The caller removes the task in the transaction that inserts the row owning the object.
 * If the request fails or the process dies first, the task survives and the object is
 * deleted once the delay has passed.
 */
export function queueUploadCleanup(key: string): Effect.Effect<string, DatabaseError> {
  const values = outboxValues(
    { kind: "R2_DELETE", payload: { key } },
    { delayMs: UPLOAD_CLEANUP_DELAY_MS },
  );
  return Effect.tryPromise({
    try: () => db.insert(outbox).values(values),
    catch: (cause) => new DatabaseError({ operation: "insert", entity: "outbox", cause }),
  }).pipe(Effect.map(() => values.id));
}

function performTask(task: OutboxTask): Promise<unknown> {
  switch (task.kind) {
    case "R2_DELETE":
      return deleteAudio(task.payload.key);
    case "R2_DELETE_PREFIX":
      return deleteAudioByPrefix(task.payload.prefix);
    case "USAGE_EVENT":
      return polar.events.ingest({
        events: [
          {
            name: task.payload.name,
            external_id: task.payload.externalId,
            external_customer_id: task.payload.orgId,
            metadata: task.payload.metadata,
            timestamp: task.payload.occurredAt,
          },
        ],
      });
  }
}

/**
 * Runs one task and removes it on success. On failure the task stays and becomes due again
 * after an exponential backoff. Never fails: the outcome is the returned boolean.
 * Every task is idempotent, so two drains running the same task at once is harmless.
 */
function processRow(row: OutboxRow): Effect.Effect<boolean> {
  return Effect.tryPromise(async () => {
    const task = outboxTaskSchema.parse({ kind: row.kind, payload: row.payload });
    await performTask(task);
    await db.delete(outbox).where(eq(outbox.id, row.id));
    return true;
  }).pipe(
    Effect.catch((error) =>
      Effect.tryPromise(async () => {
        const backoffMs = Math.min(60_000 * 2 ** row.attempts, MAX_BACKOFF_MS);
        Sentry.logger.warn("Outbox task failed; will retry", {
          outboxId: row.id,
          kind: row.kind,
          attempts: row.attempts + 1,
          error,
        });
        await db
          .update(outbox)
          .set({
            attempts: sql`${outbox.attempts} + 1`,
            availableAt: new Date(Date.now() + backoffMs),
          })
          .where(eq(outbox.id, row.id));
        return false;
      }).pipe(Effect.catch(() => Effect.succeed(false))),
    ),
  );
}

function processRows(rows: OutboxRow[]): Effect.Effect<{ processed: number; failed: number }> {
  return Effect.gen(function* () {
    let processed = 0;
    let failed = 0;
    for (const row of rows) {
      if (yield* processRow(row)) {
        processed += 1;
      } else {
        failed += 1;
      }
    }
    return { processed, failed };
  });
}

/** Runs every task that is due. Called by the cron route. */
export function drainOutbox(): Effect.Effect<{ processed: number; failed: number }, DatabaseError> {
  return Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(outbox)
          .where(lte(outbox.availableAt, new Date()))
          .orderBy(asc(outbox.availableAt))
          .limit(DRAIN_BATCH_SIZE),
      catch: (cause) => new DatabaseError({ operation: "select", entity: "outbox", cause }),
    });
    return yield* processRows(rows);
  });
}

/**
 * Tries the given tasks right after the response is sent, so the usual case does not wait
 * for the cron. Uses Next's `after` rather than a detached fiber: serverless hosts can
 * freeze the instance as soon as the response is sent. Anything that fails here is left
 * for the cron. Must be called while handling a request.
 */
export function scheduleOutboxTasks(ids: readonly string[]): Effect.Effect<void> {
  return Effect.sync(() => {
    if (ids.length === 0) return;
    after(async () => {
      const rows = await db
        .select()
        .from(outbox)
        .where(inArray(outbox.id, [...ids]))
        .catch(() => []);
      await Effect.runPromise(processRows(rows));
    });
  });
}
