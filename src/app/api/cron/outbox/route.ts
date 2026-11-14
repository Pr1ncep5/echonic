import { timingSafeEqual } from "node:crypto";
import { Effect } from "effect";
import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";
import { drainOutbox } from "@/features/outbox/services/outbox-service";

function isAuthorized(request: Request, secret: string): boolean {
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/**
 * Retries external side effects that did not succeed right away (R2 deletes, Polar usage
 * events). Meant to be called by a scheduler every few minutes with
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!isAuthorized(request, env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Effect.runPromise(
    drainOutbox().pipe(
      Effect.map((result) => Response.json(result)),
      Effect.catch((error) =>
        Effect.sync(() => {
          Sentry.captureException(error.cause, { tags: { cron: "outbox" } });
          return Response.json({ error: "Failed to read the outbox" }, { status: 500 });
        }),
      ),
    ),
  );
}
