import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { parseBuffer } from "music-metadata";

import { db } from "@/db";
import { voice } from "@/db/schema";
import { DatabaseError } from "@/db/errors";
import { uploadAudioWithRollback } from "@/lib/r2";
import { isAudioContentType } from "@/lib/audio-content-type";
import {
  scheduleUsageEvent,
  verifySubscription,
} from "@/features/billing/services/subscription-service";
import { MAX_UPLOAD_SIZE_BYTES, MIN_AUDIO_DURATION_SECONDS } from "../data/upload-limits";
import { VOICE_CATEGORIES } from "../data/voice-categories";
import {
  AudioDurationUnknownError,
  AudioInvalidError,
  AudioMissingError,
  AudioReadError,
  AudioTooLargeError,
  AudioTooShortError,
  AudioUnsupportedTypeError,
  ContentTypeMissingError,
  InvalidVoiceInputError,
  type CreateVoiceError,
} from "../domain/errors";

const createVoiceSchema = z.object({
  name: z.string().min(1, "Voice name is required"),
  category: z.enum(VOICE_CATEGORIES),
  language: z.string().min(1, "Language is required"),
  description: z.string().nullish(),
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
 * Orchestrates Custom voice creation: subscription check, input and audio validation,
 * R2 upload, DB insert, then usage metering.
 *
 * The id and R2 key are known up front, so the audio is uploaded first and the row is
 * inserted once with its key. A row therefore never exists without audio, and the only
 * compensation needed is deleting the R2 object if the insert fails.
 */
export function createVoiceWorkflow(
  input: CreateVoiceInput,
  ctx: CreateVoiceContext,
): Effect.Effect<{ id: string; name: string }, CreateVoiceError> {
  const workflow = Effect.gen(function* () {
    yield* verifySubscription(ctx.orgId);

    const parsed = createVoiceSchema.safeParse(input.params);
    if (!parsed.success) {
      return yield* Effect.fail(new InvalidVoiceInputError({ issues: parsed.error.issues }));
    }
    const params = parsed.data;

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

    yield* uploadAudioWithRollback({
      buffer,
      key: r2ObjectKey,
      contentType,
      isReferenced: async () => {
        const [existing] = await db
          .select({ id: voice.id })
          .from(voice)
          .where(eq(voice.id, id))
          .limit(1);
        return existing !== undefined;
      },
    });

    yield* Effect.tryPromise({
      try: () =>
        db.insert(voice).values({
          id,
          name: params.name,
          variant: "CUSTOM",
          orgId: ctx.orgId,
          description: params.description,
          category: params.category,
          language: params.language,
          r2ObjectKey,
        }),
      catch: (cause) => new DatabaseError({ operation: "insert", entity: "voice", cause }),
    });

    yield* scheduleUsageEvent(ctx.orgId, { name: "voice_creation", externalId: id });

    return { id, name: params.name };
  });

  // Effect.scoped binds the upload's rollback finalizer to this execution
  return Effect.scoped(workflow);
}
