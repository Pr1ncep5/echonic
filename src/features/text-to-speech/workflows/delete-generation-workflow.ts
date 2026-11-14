import { Effect } from "effect";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { generation, outbox } from "@/db/schema";
import { DatabaseError } from "@/db/errors";
import { outboxValues, scheduleOutboxTasks } from "@/features/outbox/services/outbox-service";
import { GenerationNotFoundError, type DeleteGenerationError } from "../domain/errors";

/**
 * Deletes a Generation of the Organization. The row and the task that removes its audio
 * are written in one transaction, so the audio is always deleted eventually, even if R2
 * is unreachable right now.
 */
export function deleteGenerationWorkflow(
  input: { readonly id: string },
  ctx: { readonly orgId: string },
): Effect.Effect<void, DeleteGenerationError> {
  return Effect.gen(function* () {
    const taskId = yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const [deleted] = await tx
            .delete(generation)
            .where(and(eq(generation.id, input.id), eq(generation.orgId, ctx.orgId)))
            .returning({ r2ObjectKey: generation.r2ObjectKey });
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
      catch: (cause) => new DatabaseError({ operation: "delete", entity: "generation", cause }),
    });

    if (taskId === "not-found") {
      return yield* Effect.fail(new GenerationNotFoundError({ generationId: input.id }));
    }
    if (taskId) {
      yield* scheduleOutboxTasks([taskId]);
    }
  });
}
