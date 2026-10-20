import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { Effect } from "effect";
import * as Sentry from "@sentry/nextjs";

import { db } from "@/db";
import { generation } from "@/db/schema";
import { TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import { toTRPCError } from "@/features/text-to-speech/domain/errors";
import { generateAudioWorkflow } from "@/features/text-to-speech/workflows/generate-workflow";
import { createTRPCRouter, orgProcedure } from "../init";

// Extract all columns from generation table, but omit orgId and r2ObjectKey
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const {
  orgId: _orgId,
  r2ObjectKey: _r2ObjectKey,
  ...generationSelect
} = getTableColumns(generation);

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

  getAll: orgProcedure.query(async ({ ctx }) => {
    return db
      .select(generationSelect)
      .from(generation)
      .where(eq(generation.orgId, ctx.orgId))
      .orderBy(desc(generation.createdAt));
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
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const program = generateAudioWorkflow(input, { orgId: ctx.orgId }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            console.error("[generations.create] workflow failed", error);
            Sentry.captureException(error);
          }),
        ),
        Effect.mapError(toTRPCError),
        Effect.catchDefect((defect: unknown) => {
          Sentry.captureException(defect);
          return Effect.fail(
            new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "An unexpected error occurred during audio generation",
            }),
          );
        }),
      );

      return await Effect.runPromise(program);
    }),
});
