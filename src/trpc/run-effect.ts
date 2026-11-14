import { TRPCError } from "@trpc/server";
import { Effect } from "effect";
import * as Sentry from "@sentry/nextjs";

interface RunEffectOptions<E> {
  /** Maps each domain error to what the client should see. */
  readonly toTRPCError: (error: E) => TRPCError;
  /** Which errors are worth reporting. Defaults to all; pass a filter to skip caller mistakes. */
  readonly shouldReport?: (error: E) => boolean;
  readonly tags?: Record<string, string>;
}

/**
 * Runs a workflow inside a tRPC procedure: reports failures to Sentry, converts domain
 * errors to TRPCErrors, and turns defects (bugs) into a generic 500.
 */
export function runEffect<A, E>(
  effect: Effect.Effect<A, E>,
  { toTRPCError, shouldReport, tags }: RunEffectOptions<E>,
): Promise<A> {
  return Effect.runPromise(
    effect.pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          if (shouldReport?.(error) ?? true) {
            Sentry.captureException(error, { tags });
          }
        }),
      ),
      Effect.mapError(toTRPCError),
      Effect.catchDefect((defect: unknown) => {
        Sentry.captureException(defect, { tags });
        return Effect.fail(
          new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" }),
        );
      }),
    ),
  );
}
