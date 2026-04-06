import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { voice } from "@/db/schema";
import { eq, and, or, ilike, desc, asc } from "drizzle-orm";
import { deleteAudio } from "@/lib/r2";
import { createTRPCRouter, orgProcedure } from "../init";

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
          query: z.string().trim().optional(),
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

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    // 1. Validate ownership before deleting
    const [existingVoice] = await db
      .select({ id: voice.id, r2ObjectKey: voice.r2ObjectKey })
      .from(voice)
      .where(
        and(
          eq(voice.id, input.id),
          eq(voice.variant, "CUSTOM"),
          eq(voice.orgId, ctx.orgId), // <-- Ensures strict ownership execution
        ),
      )
      .limit(1);

    if (!existingVoice) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Voice not found",
      });
    }

    // 2. Clear from database
    await db.delete(voice).where(eq(voice.id, existingVoice.id));

    // 3. Delete from bucket
    if (existingVoice.r2ObjectKey) {
      // TODO: In production, consider background jobs, retries, cron jobs etc.
      // Currently, if this command fails (network drop), the file is orphaned.
      await deleteAudio(existingVoice.r2ObjectKey).catch(() => {});
    }

    return { success: true };
  }),
});
