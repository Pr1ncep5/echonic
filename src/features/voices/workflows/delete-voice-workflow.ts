import { Effect } from "effect";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { outbox, voice } from "@/db/schema";
import { DatabaseError } from "@/db/errors";
import { outboxValues, scheduleOutboxTasks } from "@/features/outbox/services/outbox-service";
import { CustomVoiceNotFoundError, type DeleteVoiceError } from "../domain/errors";

/**
 * Deletes a Custom voice of the Organization. System voices can never match. The row and
 * the task that removes its audio are written in one transaction, so the audio is always
 * deleted eventually, even if R2 is unreachable right now.
 */
export function deleteVoiceWorkflow(
  input: { readonly id: string },
  ctx: { readonly orgId: string },
): Effect.Effect<void, DeleteVoiceError> {
  return Effect.gen(function* () {
    const taskId = yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const [deleted] = await tx
            .delete(voice)
            .where(
              and(eq(voice.id, input.id), eq(voice.variant, "CUSTOM"), eq(voice.orgId, ctx.orgId)),
            )
            .returning({ r2ObjectKey: voice.r2ObjectKey });
          if (!deleted) {
            return "not-found" as const;
          }
          if (!deleted.r2ObjectKey) {
            return null;
          }
          const task = outboxValues({ kind: "R2_DELETE", payload: { key: deleted.r2ObjectKey } });
          await tx.insert(outbox).values(task);
          return task.id;
        }),
      catch: (cause) => new DatabaseError({ operation: "delete", entity: "voice", cause }),
    });

    if (taskId === "not-found") {
      return yield* Effect.fail(new CustomVoiceNotFoundError({ voiceId: input.id }));
    }
    if (taskId) {
      yield* scheduleOutboxTasks([taskId]);
    }
  });
}
