import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, getTableColumns, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { generation } from "@/db/schema";
import { GENERATIONS_PAGE_SIZE, TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import { isInfrastructureError, toTRPCError } from "@/features/text-to-speech/domain/errors";
import { deleteGenerationWorkflow } from "@/features/text-to-speech/workflows/delete-generation-workflow";
import { generateAudioWorkflow } from "@/features/text-to-speech/workflows/generate-workflow";
import { createTRPCRouter, orgProcedure } from "../init";
import { runEffect } from "../run-effect";

// Everything the client may see: not the owning Organization, the storage key or the
// idempotency key.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const {
  orgId: _orgId,
  r2ObjectKey: _r2ObjectKey,
  idempotencyKey: _idempotencyKey,
  ...generationSelect
} = getTableColumns(generation);

const HISTORY_PREVIEW_LENGTH = 160;

export const generationsRouter = createTRPCRouter({
  getById: orgProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const [generationRecord] = await db
      .select(generationSelect)
      .from(generation)
      .where(and(eq(generation.id, input.id), eq(generation.orgId, ctx.orgId)))
      .limit(1);

    if (!generationRecord) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return {
      ...generationRecord,
      audioUrl: `/api/audio/${generationRecord.id}`,
    };
  }),

  /** The Organization's history, newest first, one page at a time. */
  list: orgProcedure
    .input(
      z.object({
        cursor: z.object({ createdAt: z.date(), id: z.string() }).nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { cursor } = input;
      const rows = await db
        .select({
          id: generation.id,
          // The list only shows one truncated line, so the full text is not sent.
          text: sql<string>`left(${generation.text}, ${HISTORY_PREVIEW_LENGTH})`,
          voiceId: generation.voiceId,
          voiceName: generation.voiceName,
          createdAt: generation.createdAt,
        })
        .from(generation)
        .where(
          and(
            eq(generation.orgId, ctx.orgId),
            cursor
              ? or(
                  lt(generation.createdAt, cursor.createdAt),
                  and(eq(generation.createdAt, cursor.createdAt), lt(generation.id, cursor.id)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(generation.createdAt), desc(generation.id))
        .limit(GENERATIONS_PAGE_SIZE + 1);

      const items = rows.slice(0, GENERATIONS_PAGE_SIZE);
      const last = items.at(-1);
      return {
        items,
        nextCursor:
          rows.length > GENERATIONS_PAGE_SIZE && last
            ? { createdAt: last.createdAt, id: last.id }
            : null,
      };
    }),

  create: orgProcedure
    .input(
      z.object({
        text: z.string().min(1).max(TEXT_MAX_LENGTH),
        voiceId: z.string().min(1),
        temperature: z.number().min(0).max(2).default(0.8),
        topP: z.number().min(0).max(1).default(0.95),
        topK: z.number().min(1).max(10000).default(1000),
        repetitionPenalty: z.number().min(1).max(2).default(1.2),
        idempotencyKey: z.uuid(),
      }),
    )
    .mutation(({ input, ctx }) =>
      runEffect(generateAudioWorkflow(input, { orgId: ctx.orgId }), {
        toTRPCError,
        shouldReport: isInfrastructureError,
        tags: { orgId: ctx.orgId },
      }),
    ),

  // Any Member may delete: Generations are shared history and record no author.
  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(({ input, ctx }) =>
    runEffect(deleteGenerationWorkflow(input, { orgId: ctx.orgId }), {
      toTRPCError,
      shouldReport: isInfrastructureError,
      tags: { orgId: ctx.orgId },
    }),
  ),
});
