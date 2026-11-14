import { TRPCError } from "@trpc/server";
import { findSoleOwnedOrganizations } from "@/features/organizations/services/ownership-service";
import { createTRPCRouter, protectedProcedure } from "../init";
import { runEffect } from "../run-effect";

export const accountRouter = createTRPCRouter({
  /** Organizations that block account deletion until ownership is transferred. */
  getSoleOwnedOrganizations: protectedProcedure.query(({ ctx }) =>
    runEffect(findSoleOwnedOrganizations(ctx.userId), {
      toTRPCError: () =>
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to load your organizations",
        }),
      tags: { userId: ctx.userId },
    }),
  ),
});
