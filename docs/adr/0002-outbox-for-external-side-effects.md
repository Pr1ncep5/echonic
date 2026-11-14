# Outbox table for side effects on R2 and Polar

Deleting audio from R2 and reporting Usage events to Polar are queued as rows in an `outbox` table, written in the same database transaction as the change that causes them, and removed once the side effect succeeds. A request tries its own rows right after responding; a scheduled call to `/api/cron/outbox` retries whatever is left, with exponential backoff.

We chose this over in-process compensation (Effect `acquireRelease`), which we used before. Compensation only runs while the process is alive, so a serverless timeout between "audio uploaded" and "row inserted" left an orphaned object, a failed R2 delete was only logged, and a Usage event lost to a Polar outage was never billed. We also rejected a periodic sweep that lists the bucket and compares it with the database: it is slow, costs more as the bucket grows, and does nothing for lost Usage events.

Uploads use the same table in reverse: before uploading, a delayed delete of the key is queued; the transaction that inserts the owning row cancels it. If the request dies, the delete survives and runs after 30 minutes.

Consequences: every task must be idempotent, because two drains may run the same row (R2 deletes are; Polar deduplicates on `external_id`). A scheduler must call the cron route, or failed side effects wait forever. Moving off this later means replacing every place that writes to `outbox`.
