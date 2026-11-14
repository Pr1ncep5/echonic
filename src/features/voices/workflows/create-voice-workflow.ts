import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { parseBuffer } from "music-metadata";

import { db } from "@/db";
import { outbox, voice } from "@/db/schema";
import { DatabaseError } from "@/db/errors";
import { uploadAudio } from "@/lib/r2";
import { isAudioContentType } from "@/lib/audio-content-type";
import {
  usageEventTask,
  verifySubscription,
} from "@/features/billing/services/subscription-service";
import {
  outboxValues,
  queueUploadCleanup,
  scheduleOutboxTasks,
} from "@/features/outbox/services/outbox-service";
import {
  MAX_UPLOAD_SIZE_BYTES,
  MIN_AUDIO_DURATION_SECONDS,
  VOICE_DESCRIPTION_MAX_LENGTH,
  VOICE_NAME_MAX_LENGTH,
} from "../data/upload-limits";
import { VOICE_CATEGORIES } from "../data/voice-categories";
import {
  AudioDurationUnknownError,
  AudioInvalidError,
  AudioMissingError,
  AudioReadError,
  AudioTooLargeError,
  AudioTooShortError,
  AudioUnsupportedTypeError,
  ConsentMissingError,
  ContentTypeMissingError,
  InvalidVoiceInputError,
  type CreateVoiceError,
} from "../domain/errors";

const createVoiceSchema = z.object({
  name: z.string().trim().min(1, "Voice name is required").max(VOICE_NAME_MAX_LENGTH),
  category: z.enum(VOICE_CATEGORIES),
  // A BCP 47 tag such as "en-US"; the UI turns its region into a flag.
  language: z
    .string()
    .max(35)
    .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "Language is invalid"),
  description: z.string().trim().max(VOICE_DESCRIPTION_MAX_LENGTH).nullish(),
  consent: z.string().nullish(),
});

/**
 * The raw request. Nothing here is validated or read until the subscription check passes,
 * so an Organization without a subscription always gets SUBSCRIPTION_REQUIRED.
 */
export interface CreateVoiceInput {
  readonly params: unknown;
  readonly contentTypeHeader: string | null;
  readonly body: ReadableStream<Uint8Array> | null;
}

export interface CreateVoiceContext {
  readonly orgId: string;
  /** The Member creating the voice; recorded as the one who gave consent. */
  readonly userId: string;
}

type ReadResult =
  | { readonly tooLarge: true }
  | { readonly tooLarge: false; readonly buffer: Buffer };

/**
 * Reads the body chunk by chunk and stops as soon as it passes `maxBytes`, so an
 * oversized upload is never held in memory in full.
 */
async function readWithLimit(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<ReadResult> {
  if (!body) {
    return { tooLarge: false, buffer: Buffer.alloc(0) };
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return { tooLarge: true };
    }
    chunks.push(value);
  }
  return { tooLarge: false, buffer: Buffer.concat(chunks, totalBytes) };
}

function loadAudio(
  body: ReadableStream<Uint8Array> | null,
): Effect.Effect<Buffer, AudioMissingError | AudioTooLargeError | AudioReadError> {
  return Effect.gen(function* () {
    const result = yield* Effect.tryPromise({
      try: () => readWithLimit(body, MAX_UPLOAD_SIZE_BYTES),
      catch: (cause) => new AudioReadError({ cause }),
    });

    if (result.tooLarge) {
      return yield* Effect.fail(new AudioTooLargeError({ maxBytes: MAX_UPLOAD_SIZE_BYTES }));
    }
    if (!result.buffer.byteLength) {
      return yield* Effect.fail(new AudioMissingError());
    }
    return result.buffer;
  });
}

function validateDuration(
  buffer: Buffer,
  contentType: string,
): Effect.Effect<void, AudioInvalidError | AudioDurationUnknownError | AudioTooShortError> {
  return Effect.gen(function* () {
    const metadata = yield* Effect.tryPromise({
      try: () => parseBuffer(buffer, { mimeType: contentType }, { duration: true }),
      catch: (cause) => new AudioInvalidError({ cause }),
    });

    const durationSeconds = metadata.format.duration;
    if (durationSeconds === undefined) {
      return yield* Effect.fail(new AudioDurationUnknownError());
    }
    if (durationSeconds < MIN_AUDIO_DURATION_SECONDS) {
      return yield* Effect.fail(
        new AudioTooShortError({ durationSeconds, minSeconds: MIN_AUDIO_DURATION_SECONDS }),
      );
    }
  });
}

/**
 * Orchestrates Custom voice creation: subscription check, input, consent and audio
 * validation, R2 upload, DB insert, then usage metering.
 *
 * As in generate-workflow.ts, a delayed cleanup task is queued before the upload, and one
 * transaction inserts the voice, cancels that cleanup and queues the Usage event.
 */
export function createVoiceWorkflow(
  input: CreateVoiceInput,
  ctx: CreateVoiceContext,
): Effect.Effect<{ id: string; name: string }, CreateVoiceError> {
  return Effect.gen(function* () {
    yield* verifySubscription(ctx.orgId);

    const parsed = createVoiceSchema.safeParse(input.params);
    if (!parsed.success) {
      return yield* Effect.fail(new InvalidVoiceInputError({ issues: parsed.error.issues }));
    }
    const params = parsed.data;
    if (params.consent !== "true") {
      return yield* Effect.fail(new ConsentMissingError());
    }

    if (input.contentTypeHeader === null) {
      return yield* Effect.fail(new ContentTypeMissingError());
    }
    const contentType = input.contentTypeHeader.split(";")[0]?.trim() || "audio/wav";
    // The type is stored on the R2 object and served back from our origin, so a non-audio
    // type like text/html would turn the upload into a page (stored XSS).
    if (!isAudioContentType(contentType)) {
      return yield* Effect.fail(new AudioUnsupportedTypeError({ contentType }));
    }

    const buffer = yield* loadAudio(input.body);
    yield* validateDuration(buffer, contentType);

    const id = createId();
    const r2ObjectKey = `voices/orgs/${ctx.orgId}/${id}`;

    const cleanupTaskId = yield* queueUploadCleanup(r2ObjectKey);
    yield* uploadAudio({ buffer, key: r2ObjectKey, contentType });

    const usageTask = outboxValues(
      usageEventTask(ctx.orgId, { name: "voice_creation", externalId: id }),
    );
    yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          await tx.insert(voice).values({
            id,
            name: params.name,
            variant: "CUSTOM",
            orgId: ctx.orgId,
            description: params.description,
            category: params.category,
            language: params.language,
            r2ObjectKey,
            consentedAt: new Date(),
            consentedByUserId: ctx.userId,
          });
          await tx.delete(outbox).where(eq(outbox.id, cleanupTaskId));
          await tx.insert(outbox).values(usageTask);
        }),
      catch: (cause) => new DatabaseError({ operation: "insert", entity: "voice", cause }),
    });

    yield* scheduleOutboxTasks([usageTask.id]);

    return { id, name: params.name };
  });
}
