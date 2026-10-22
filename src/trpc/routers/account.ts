import { TRPCError } from "@trpc/server";
import { Effect } from "effect";
import * as Sentry from "@sentry/nextjs";
import { findSoleOwnedOrganizations } from "@/features/organizations/services/ownership-service";
import { createTRPCRouter, protectedProcedure } from "../init";

export const accountRouter = createTRPCRouter({
  /** Organizations that block account deletion until ownership is transferred. */
  getSoleOwnedOrganizations: protectedProcedure.query(({ ctx }) =>
    Effect.runPromise(
      findSoleOwnedOrganizations(ctx.userId).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => Sentry.captureException(error.cause, { tags: { userId: ctx.userId } })),
        ),
        Effect.mapError(
          () =>
            new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to load your organizations",
            }),
        ),
      ),
    ),
  ),
});
