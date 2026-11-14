import { asc } from "drizzle-orm";

import { db } from "@/db";
import { outbox } from "@/db/schema";

/** Every side effect still waiting in the outbox, oldest first. */
export function queuedTasks() {
  return db
    .select({ kind: outbox.kind, payload: outbox.payload, availableAt: outbox.availableAt })
    .from(outbox)
    .orderBy(asc(outbox.createdAt));
}
