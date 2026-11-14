import { Effect } from "effect";
import { and, count, eq, gt, or } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import * as Sentry from "@sentry/nextjs";

import { db } from "@/db";
import { generation, outbox, voice } from "@/db/schema";
import { DatabaseError, isUniqueViolation } from "@/db/errors";
import { uploadAudio } from "@/lib/r2";
import {
  usageEventTask,
  verifySubscription,
} from "@/features/billing/services/subscription-service";
import {
  outboxValues,
  queueUploadCleanup,
  scheduleOutboxTasks,
} from "@/features/outbox/services/outbox-service";
import { GENERATIONS_PER_MINUTE } from "../data/constants";
import { generateSpeech } from "../services/tts-service";
import {
  GenerationRateLimitedError,
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
  /** Chosen by the client once per submit; a repeat returns the first Generation. */
  readonly idempotencyKey: string;
}

export interface GenerateAudioContext {
  readonly orgId: string;
}

function findByIdempotencyKey(
  orgId: string,
  idempotencyKey: string,
): Effect.Effect<{ id: string } | undefined, DatabaseError> {
  return Effect.tryPromise({
    try: () =>
      db
        .select({ id: generation.id })
        .from(generation)
        .where(and(eq(generation.orgId, orgId), eq(generation.idempotencyKey, idempotencyKey)))
        .limit(1),
    catch: (cause) => new DatabaseError({ operation: "select", entity: "generation", cause }),
  }).pipe(Effect.map(([existing]) => existing));
}

/**
 * Fails when the Organization has already completed its allowance of Generations in the
 * last minute. Counts stored Generations, so it needs no extra infrastructure; requests
 * still in flight are not counted, which is acceptable for a cost guard.
 */
function enforceRateLimit(
  orgId: string,
): Effect.Effect<void, DatabaseError | GenerationRateLimitedError> {
  return Effect.gen(function* () {
    const [recent] = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ total: count() })
          .from(generation)
          .where(
            and(
              eq(generation.orgId, orgId),
              gt(generation.createdAt, new Date(Date.now() - 60_000)),
            ),
          ),
      catch: (cause) => new DatabaseError({ operation: "select", entity: "generation", cause }),
    });
    if ((recent?.total ?? 0) >= GENERATIONS_PER_MINUTE) {
      return yield* Effect.fail(
        new GenerationRateLimitedError({ orgId, limitPerMinute: GENERATIONS_PER_MINUTE }),
      );
    }
  });
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
 * Orchestrates the TTS generation pipeline.
 *
 * Nothing is left behind when a step fails or the process dies:
 * - Before the upload, a delayed cleanup task for the R2 key is queued in the outbox.
 * - One transaction then inserts the Generation, cancels that cleanup task and queues the
 *   Usage event. Either all three happen or none do, so audio without a row is always
 *   cleaned up, a row never loses its audio, and usage is billed exactly once.
 */
export function generateAudioWorkflow(
  input: GenerateAudioInput,
  ctx: GenerateAudioContext,
): Effect.Effect<{ id: string }, GenerationError> {
  return Effect.gen(function* () {
    // 1. Check subscription
    yield* verifySubscription(ctx.orgId);

    // 2. A retried submit returns the Generation it already produced
    const previous = yield* findByIdempotencyKey(ctx.orgId, input.idempotencyKey);
    if (previous) {
      return previous;
    }

    yield* enforceRateLimit(ctx.orgId);

    // 3. Fetch and validate voice
    const voiceRecord = yield* resolveVoice(input.voiceId, ctx.orgId);

    Sentry.logger.info("Generation started", {
      orgId: ctx.orgId,
      voiceId: input.voiceId,
      textLength: input.text.length,
    });

    // 4. Generate speech via microservice with timeout & retries
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

    // 5. Upload the audio, with its cleanup queued first
    const cleanupTaskId = yield* queueUploadCleanup(r2Key);
    yield* uploadAudio({ buffer: audioBuffer, key: r2Key });

    // 6. Record the Generation, keep its audio and queue the Usage event, atomically
    const usageTask = outboxValues(
      usageEventTask(ctx.orgId, {
        name: "tts_generation",
        externalId: generationId,
        metadata: { characters: input.text.length },
      }),
    );
    const inserted = yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          await tx.insert(generation).values({
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
            idempotencyKey: input.idempotencyKey,
          });
          await tx.delete(outbox).where(eq(outbox.id, cleanupTaskId));
          await tx.insert(outbox).values(usageTask);
        }),
      catch: (cause) => new DatabaseError({ operation: "insert", entity: "generation", cause }),
    }).pipe(
      Effect.map(() => true),
      // Two identical submits ran at once and the other one won. Its Generation is the
      // answer; this one's audio is removed by the cleanup task that was left queued.
      Effect.catchIf(
        (error) => isUniqueViolation(error.cause),
        () => Effect.succeed(false),
      ),
    );

    if (!inserted) {
      const winner = yield* findByIdempotencyKey(ctx.orgId, input.idempotencyKey);
      if (winner) {
        return winner;
      }
      return yield* Effect.fail(
        new DatabaseError({ operation: "insert", entity: "generation", cause: "lost race" }),
      );
    }

    Sentry.logger.info("Audio generated successfully", {
      orgId: ctx.orgId,
      generationId,
    });

    // 7. Report usage to Polar after the response is sent; the cron retries if this fails
    yield* scheduleOutboxTasks([usageTask.id]);

    return { id: generationId };
  });
}
