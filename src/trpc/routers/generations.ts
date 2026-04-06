import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, getTableColumns, or } from "drizzle-orm";
import { db } from "@/db";
import { generation, voice } from "@/db/schema";
import { chatterbox } from "@/lib/chatterbox-client";
import { uploadAudio } from "@/lib/r2";
import { TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import { createTRPCRouter, orgProcedure } from "../init";

// Extract all columns from generation table, but omit orgId and r2ObjectKey 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { orgId: orgId, r2ObjectKey, ...generationSelect } = getTableColumns(generation);

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
      const [voiceRecord] = await db
        .select({
          id: voice.id,
          name: voice.name,
          r2ObjectKey: voice.r2ObjectKey,
        })
        .from(voice)
        .where(
          and(
            eq(voice.id, input.voiceId),
            or(
              eq(voice.variant, "SYSTEM"),
              and(eq(voice.variant, "CUSTOM"), eq(voice.orgId, ctx.orgId)),
            ),
          ),
        )
        .limit(1);

      if (!voiceRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice not found",
        });
      }

      if (!voiceRecord.r2ObjectKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Voice audio not available",
        });
      }

      const { data, error } = await chatterbox.POST("/generate", {
        body: {
          prompt: input.text,
          voice_key: voiceRecord.r2ObjectKey,
          temperature: input.temperature,
          top_p: input.topP,
          top_k: input.topK,
          repetition_penalty: input.repetitionPenalty,
          norm_loudness: true,
        },
        parseAs: "arrayBuffer",
      });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate audio",
        });
      }

      if (!(data instanceof ArrayBuffer)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid audio response",
        });
      }

      const buffer = Buffer.from(data);
      
      let generationId: string | null = null;
      let r2ObjectKey: string | null = null;

      try {
        const [createdGeneration] = await db
          .insert(generation)
          .values({
            orgId: ctx.orgId,
            text: input.text,
            voiceName: voiceRecord.name,
            voiceId: voiceRecord.id,
            temperature: input.temperature,
            topP: input.topP,
            topK: input.topK,
            repetitionPenalty: input.repetitionPenalty,
          })
          .returning({ id: generation.id });

        if (!createdGeneration) {
          throw new Error("Failed to create generation");
        }

        generationId = createdGeneration.id;
        r2ObjectKey = `generations/orgs/${ctx.orgId}/${createdGeneration.id}`;

        await uploadAudio({ buffer, key: r2ObjectKey });

        await db
          .update(generation)
          .set({ r2ObjectKey })
          .where(eq(generation.id, createdGeneration.id));
      } catch {
        if (generationId) {
          await db.delete(generation).where(eq(generation.id, generationId)).catch(() => {});
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store generated audio",
        });
      }

      if (!generationId || !r2ObjectKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store generated audio",
        });
      }

      return {
        id: generationId,
      };
    }),
});
