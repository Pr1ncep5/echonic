import { Effect } from "effect";
import { and, eq, or } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import * as Sentry from "@sentry/nextjs";

import { db } from "@/db";
import { generation, voice } from "@/db/schema";
import { DatabaseError } from "@/db/errors";
import { uploadAudioWithRollback } from "@/lib/r2";
import {
  scheduleUsageEvent,
  verifySubscription,
} from "@/features/billing/services/subscription-service";
import { generateSpeech } from "../services/tts-service";
import {
  VoiceAudioUnavailableError,
  VoiceNotFoundError,
  type GenerationError,
} from "../domain/errors";

export interface GenerateAudioInput {
  readonly text: string;
  readonly voiceId: string;
  readonly temperature: number;
  readonly topP: number;
  readonly topK: number;
  readonly repetitionPenalty: number;
}

export interface GenerateAudioContext {
  readonly orgId: string;
}

/**
 * Step 1: Fetch voice record and validate that audio sample is available.
 */
function resolveVoice(
  voiceId: string,
  orgId: string,
): Effect.Effect<
  { id: string; name: string; r2ObjectKey: string },
  DatabaseError | VoiceNotFoundError | VoiceAudioUnavailableError
> {
  return Effect.gen(function* () {
    const [voiceRecord] = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: voice.id,
            name: voice.name,
            r2ObjectKey: voice.r2ObjectKey,
          })
          .from(voice)
          .where(
            and(
              eq(voice.id, voiceId),
              or(
                eq(voice.variant, "SYSTEM"),
                and(eq(voice.variant, "CUSTOM"), eq(voice.orgId, orgId)),
              ),
            ),
          )
          .limit(1),
      catch: (cause) => new DatabaseError({ operation: "select", entity: "voice", cause }),
    });

    if (!voiceRecord) {
      return yield* Effect.fail(new VoiceNotFoundError({ voiceId }));
    }
    if (!voiceRecord.r2ObjectKey) {
      return yield* Effect.fail(new VoiceAudioUnavailableError({ voiceId }));
    }
    return { id: voiceRecord.id, name: voiceRecord.name, r2ObjectKey: voiceRecord.r2ObjectKey };
  });
}

/**
 * Main Saga: Orchestrates the TTS generation pipeline with guaranteed rollback.
 *
 * The id and R2 key are known up front, so the audio is uploaded first and the row is
 * inserted once with its key. A Generation row therefore never exists without audio, and
 * the only compensation needed is: if the insert fails, Effect.acquireRelease deletes the
 * uploaded R2 object so no orphaned files remain in storage.
 */
export function generateAudioWorkflow(
  input: GenerateAudioInput,
  ctx: GenerateAudioContext,
): Effect.Effect<{ id: string }, GenerationError> {
  const workflow = Effect.gen(function* () {
    // 1. Check subscription
    yield* verifySubscription(ctx.orgId);

    // 2. Fetch and validate voice
    const voiceRecord = yield* resolveVoice(input.voiceId, ctx.orgId);

    Sentry.logger.info("Generation started", {
      orgId: ctx.orgId,
      voiceId: input.voiceId,
      textLength: input.text.length,
    });

    // 3. Generate speech via microservice with timeout & retries
    const audioBuffer = yield* generateSpeech({
      prompt: input.text,
      voiceKey: voiceRecord.r2ObjectKey,
      temperature: input.temperature,
      topP: input.topP,
      topK: input.topK,
      repetitionPenalty: input.repetitionPenalty,
      normLoudness: true,
    });

    const generationId = createId();
    const r2Key = `generations/orgs/${ctx.orgId}/${generationId}`;

    // 4. Saga: Upload audio to Cloudflare R2, deleting it again if a later step fails
    yield* uploadAudioWithRollback({
      buffer: audioBuffer,
      key: r2Key,
      isReferenced: async () => {
        const [existing] = await db
          .select({ id: generation.id })
          .from(generation)
          .where(eq(generation.id, generationId))
          .limit(1);
        return existing !== undefined;
      },
    });

    // 5. Insert the database record with the R2 key already set
    yield* Effect.tryPromise({
      try: () =>
        db.insert(generation).values({
          id: generationId,
          orgId: ctx.orgId,
          text: input.text,
          voiceName: voiceRecord.name,
          voiceId: voiceRecord.id,
          r2ObjectKey: r2Key,
          temperature: input.temperature,
          topP: input.topP,
          topK: input.topK,
          repetitionPenalty: input.repetitionPenalty,
        }),
      catch: (cause) => new DatabaseError({ operation: "insert", entity: "generation", cause }),
    });

    Sentry.logger.info("Audio generated successfully", {
      orgId: ctx.orgId,
      generationId,
    });

    // 6. Billing metering, after the response is sent
    yield* scheduleUsageEvent(ctx.orgId, {
      name: "tts_generation",
      externalId: generationId,
      metadata: { characters: input.text.length },
    });

    return { id: generationId };
  });

  // Effect.scoped ensures all acquireRelease finalizers are bound to this execution
  return Effect.scoped(workflow);
}
