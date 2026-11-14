import { Effect } from "effect";

import { db } from "@/db";
import { outbox } from "@/db/schema";
import { DatabaseError } from "@/db/errors";
import { organizationAudioPrefixes } from "@/features/outbox/domain/tasks";
import { outboxValues } from "@/features/outbox/services/outbox-service";

/**
 * Queues the removal of all audio a deleted Organization owned. Its Voice and Generation
 * rows are already gone (cascade), so the objects are found by the Organization's key
 * prefixes rather than by row. Organization ids are never reused, so the prefixes are safe
 * to delete at any later time.
 */
export function queueOrganizationAudioDeletion(orgId: string): Effect.Effect<void, DatabaseError> {
  return Effect.tryPromise({
    try: () =>
      db
        .insert(outbox)
        .values(
          organizationAudioPrefixes(orgId).map((prefix) =>
            outboxValues({ kind: "R2_DELETE_PREFIX", payload: { prefix } }),
          ),
        ),
    catch: (cause) => new DatabaseError({ operation: "insert", entity: "outbox", cause }),
  }).pipe(Effect.asVoid);
}
