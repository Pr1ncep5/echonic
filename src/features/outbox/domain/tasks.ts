import { z } from "zod";

/**
 * A side effect on an external service that must eventually happen.
 * - R2_DELETE: delete one stored audio object.
 * - R2_DELETE_PREFIX: delete every object under a prefix (a deleted Organization's audio).
 * - USAGE_EVENT: ingest a Usage event into Polar.
 */
export const outboxTaskSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("R2_DELETE"), payload: z.object({ key: z.string().min(1) }) }),
  z.object({
    kind: z.literal("R2_DELETE_PREFIX"),
    payload: z.object({ prefix: z.string().min(1) }),
  }),
  z.object({
    kind: z.literal("USAGE_EVENT"),
    payload: z.object({
      orgId: z.string().min(1),
      name: z.string().min(1),
      // Polar deduplicates on this, so a retried ingest cannot double-bill.
      externalId: z.string().min(1),
      metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
      // When the billable work happened, not when the event was finally delivered.
      occurredAt: z.iso.datetime(),
    }),
  }),
]);

export type OutboxTask = z.infer<typeof outboxTaskSchema>;

/** Prefixes of every R2 object an Organization owns. */
export function organizationAudioPrefixes(orgId: string): string[] {
  return [`voices/orgs/${orgId}/`, `generations/orgs/${orgId}/`];
}
