import { Effect, Exit } from "effect";
import { and, eq, or } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";

import { db } from "@/db";
import { generation, voice } from "@/db/schema";
import { isPolarNotFound, polar } from "@/lib/polar";
import { deleteAudio, uploadAudio } from "@/lib/r2";
import { generateSpeech } from "../services/tts-service";
import {
  BillingServiceError,
  DatabaseError,
  StorageUploadError,
  SubscriptionRequiredError,
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
 * Step 1: Verify that the organization has an active Polar subscription.
 */
function verifySubscription(
  orgId: string,
): Effect.Effect<void, SubscriptionRequiredError | BillingServiceError> {
  return Effect.gen(function* () {
    const customerState = yield* Effect.tryPromise({
      try: () => polar.customers.getStateExternal(orgId),
      catch: (cause) =>
        // A 404 means the org has no Polar customer yet, i.e. no subscription
        isPolarNotFound(cause)
          ? new SubscriptionRequiredError({ orgId })
          : new BillingServiceError({ orgId, cause }),
    });

    const hasActiveSubscription = (customerState.active_subscriptions ?? []).length > 0;
    if (!hasActiveSubscription) {
      return yield* Effect.fail(new SubscriptionRequiredError({ orgId }));
    }
  });
}

/**
 * Step 2: Fetch voice record and validate that audio sample is available.
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
    return voiceRecord as { id: string; name: string; r2ObjectKey: string };
  });
}

/**
 * Step 3: Background telemetry / Polar usage metering.
 * Runs in the background and will never block or fail the user response.
 */
function recordUsageEvent(orgId: string, textLength: number): Effect.Effect<void> {
  return Effect.tryPromise({
    try: async () => {
      await polar.events.ingest({
        events: [
          {
            name: "tts_generation",
            external_customer_id: orgId,
            metadata: { characters: textLength },
            timestamp: new Date().toISOString(),
          },
        ],
      });
    },
    catch: (cause) => {
      Sentry.logger.warn("Failed to ingest Polar TTS usage event", {
        orgId,
        textLength,
        error: cause,
      });
    },
  }).pipe(Effect.ignore);
}

/**
 * Main Saga: Orchestrates the TTS generation pipeline with guaranteed rollback.
 * Uses Effect.acquireRelease to ensure that:
 * 1. If R2 upload fails, the database draft row is deleted.
 * 2. If the database update fails, BOTH the uploaded R2 audio file AND the database row are cleaned up.
 * 3. No orphaned files remain in storage upon any failure.
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

    // 4. Saga: Insert database record with automatic rollback on failure
    const createdGeneration = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: async () => {
          const [inserted] = await db
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

          if (!inserted) {
            throw new Error("Database failed to return inserted generation ID");
          }
          return inserted;
        },
        catch: (cause) => new DatabaseError({ operation: "insert", entity: "generation", cause }),
      }),
      (created, exit) =>
        Exit.isFailure(exit)
          ? Effect.tryPromise({
              try: () => db.delete(generation).where(eq(generation.id, created.id)),
              catch: () => undefined,
            }).pipe(Effect.ignore)
          : Effect.void,
    );

    const r2Key = `generations/orgs/${ctx.orgId}/${createdGeneration.id}`;

    // 5. Saga: Upload audio to Cloudflare R2 with automatic cleanup on failure
    yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => uploadAudio({ buffer: audioBuffer, key: r2Key }),
        catch: (cause) => new StorageUploadError({ key: r2Key, cause }),
      }),
      (_, exit) =>
        Exit.isFailure(exit)
          ? Effect.tryPromise({
              try: () => deleteAudio(r2Key),
              catch: () => undefined,
            }).pipe(Effect.ignore)
          : Effect.void,
    );

    // 6. Update database record with the final R2 key
    yield* Effect.tryPromise({
      try: () =>
        db
          .update(generation)
          .set({ r2ObjectKey: r2Key })
          .where(eq(generation.id, createdGeneration.id)),
      catch: (cause) => new DatabaseError({ operation: "update", entity: "generation", cause }),
    });

    Sentry.logger.info("Audio generated successfully", {
      orgId: ctx.orgId,
      generationId: createdGeneration.id,
    });

    // 7. Background billing metering (non-blocking)
    yield* Effect.forkDetach(recordUsageEvent(ctx.orgId, input.text.length));

    return { id: createdGeneration.id };
  });

  // Effect.scoped ensures all acquireRelease finalizers are bound to this execution
  return Effect.scoped(workflow);
}
