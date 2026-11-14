import { z } from "zod";
import { db } from "@/db";
import { voice } from "@/db/schema";
import { eq, and, or, ilike, desc, asc } from "drizzle-orm";
import { deleteVoiceErrorToTRPCError } from "@/features/voices/domain/errors";
import { deleteVoiceWorkflow } from "@/features/voices/workflows/delete-voice-workflow";
import { createTRPCRouter, orgAdminProcedure, orgProcedure } from "../init";
import { runEffect } from "../run-effect";

/**
 * Escapes special characters used in SQL LIKE/ILIKE patterns.
 * * Note: While Drizzle automatically parameterizes queries to prevent
 * SQL injection, it does NOT automatically escape SQL wildcards (`%` and `_`).
 *
 * * If we don't escape these, a user searching for "100%" would trigger a wildcard
 * search for "100" followed by any characters, rather than the literal string "100%".
 * * @param str - The raw user input string to escape.
 * @returns The escaped string safe for literal pattern matching.
 */
export function escapeLikePattern(str: string): string {
  return str.replace(/[\\%_]/g, "\\$&");
}

export const voicesRouter = createTRPCRouter({
  getAll: orgProcedure
    .input(
      z
        .object({
          query: z.string().trim().max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // 1. Escape the user input to prevent "Wildcard Injection"
      // 2. Wrap the safely escaped string in `%` for the actual ILIKE search
      const safeSearchTerm = input?.query ? `%${escapeLikePattern(input.query)}%` : undefined;

      // Create flexible search condition for Drizzle
      const searchCondition = safeSearchTerm
        ? or(ilike(voice.name, safeSearchTerm), ilike(voice.description, safeSearchTerm))
        : undefined;

      const [custom, system] = await Promise.all([
        db
          .select({
            id: voice.id,
            name: voice.name,
            description: voice.description,
            category: voice.category,
            language: voice.language,
            variant: voice.variant,
          })
          .from(voice)
          .where(and(eq(voice.variant, "CUSTOM"), eq(voice.orgId, ctx.orgId), searchCondition))
          .orderBy(desc(voice.createdAt)),

        db
          .select({
            id: voice.id,
            name: voice.name,
            description: voice.description,
            category: voice.category,
            language: voice.language,
            variant: voice.variant,
          })
          .from(voice)
          .where(and(eq(voice.variant, "SYSTEM"), searchCondition))
          .orderBy(asc(voice.name)),
      ]);

      return { custom, system };
    }),

  // Owners and admins only: every Member's work may depend on a Custom voice.
  delete: orgAdminProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) =>
    runEffect(deleteVoiceWorkflow(input, { orgId: ctx.orgId }), {
      toTRPCError: deleteVoiceErrorToTRPCError,
      // oxlint-disable-next-line eslint/no-underscore-dangle
      shouldReport: (error) => error._tag === "Database",
      tags: { orgId: ctx.orgId },
    }),
  ),
});
