import { Data } from "effect";
import type { z } from "zod";
import type {
  BillingServiceError,
  SubscriptionRequiredError,
} from "@/features/billing/domain/errors";
import type { DatabaseError } from "@/db/errors";
import type { StorageUploadError } from "@/lib/r2";

/**
 * Thrown when the voice details in the query string fail validation.
 */
export class InvalidVoiceInputError extends Data.TaggedError("InvalidVoiceInput")<{
  readonly issues: z.ZodError["issues"];
}> {}

/**
 * Thrown when the upload has no Content-Type header.
 */
export class ContentTypeMissingError extends Data.TaggedError("ContentTypeMissing") {}

/**
 * Thrown when the upload's Content-Type is not an audio type.
 */
export class AudioUnsupportedTypeError extends Data.TaggedError("AudioUnsupportedType")<{
  readonly contentType: string;
}> {}

/**
 * Thrown when the request body contains no audio.
 */
export class AudioMissingError extends Data.TaggedError("AudioMissing") {}

/**
 * Thrown when the uploaded audio exceeds the size limit.
 */
export class AudioTooLargeError extends Data.TaggedError("AudioTooLarge")<{
  readonly maxBytes: number;
}> {}

/**
 * Thrown when the request body cannot be read, e.g. the client dropped the connection.
 */
export class AudioReadError extends Data.TaggedError("AudioRead")<{
  readonly cause?: unknown;
}> {}

/**
 * Thrown when the upload cannot be parsed as audio.
 */
export class AudioInvalidError extends Data.TaggedError("AudioInvalid")<{
  readonly cause?: unknown;
}> {}

/**
 * Thrown when the audio's duration cannot be determined, e.g. a container without a
 * duration header.
 */
export class AudioDurationUnknownError extends Data.TaggedError("AudioDurationUnknown") {}

/**
 * Thrown when the audio is shorter than the minimum needed for voice cloning.
 */
export class AudioTooShortError extends Data.TaggedError("AudioTooShort")<{
  readonly durationSeconds: number;
  readonly minSeconds: number;
}> {}

/**
 * Union of all domain errors that can occur while creating a Custom voice.
 */
export type CreateVoiceError =
  | SubscriptionRequiredError
  | BillingServiceError
  | InvalidVoiceInputError
  | ContentTypeMissingError
  | AudioUnsupportedTypeError
  | AudioMissingError
  | AudioTooLargeError
  | AudioReadError
  | AudioInvalidError
  | AudioDurationUnknownError
  | AudioTooShortError
  | StorageUploadError
  | DatabaseError;

/**
 * True for failures that point at our infrastructure rather than at the caller's input,
 * so only these are worth reporting to Sentry.
 */
export function isInfrastructureError(error: CreateVoiceError): boolean {
  // oxlint-disable-next-line eslint/no-underscore-dangle
  switch (error._tag) {
    case "BillingService":
    case "StorageUpload":
    case "Database":
      return true;
    case "SubscriptionRequired":
    case "InvalidVoiceInput":
    case "ContentTypeMissing":
    case "AudioUnsupportedType":
    case "AudioMissing":
    case "AudioTooLarge":
    case "AudioRead":
    case "AudioInvalid":
    case "AudioDurationUnknown":
    case "AudioTooShort":
      return false;
  }
}

/**
 * Exhaustively maps any CreateVoiceError to an HTTP response.
 * TypeScript guarantees at compile time that all tagged errors are handled.
 */
export function toErrorResponse(error: CreateVoiceError): Response {
  // oxlint-disable-next-line eslint/no-underscore-dangle
  switch (error._tag) {
    case "SubscriptionRequired":
      return Response.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    case "BillingService":
      return Response.json(
        { error: "Failed to communicate with billing service" },
        { status: 502 },
      );
    case "InvalidVoiceInput":
      return Response.json({ error: "Invalid input", issues: error.issues }, { status: 400 });
    case "ContentTypeMissing":
      return Response.json({ error: "Missing Content-Type header" }, { status: 400 });
    case "AudioUnsupportedType":
      return Response.json(
        { error: `Unsupported file type "${error.contentType}". Please upload an audio file.` },
        { status: 415 },
      );
    case "AudioMissing":
      return Response.json({ error: "Please upload an audio file" }, { status: 400 });
    case "AudioTooLarge":
      return Response.json(
        { error: `Audio file exceeds the ${error.maxBytes / (1024 * 1024)} MB size limit` },
        { status: 413 },
      );
    case "AudioRead":
      return Response.json(
        { error: "Failed to read the uploaded file. Please retry." },
        { status: 400 },
      );
    case "AudioInvalid":
      return Response.json({ error: "File is not a valid audio file" }, { status: 422 });
    case "AudioDurationUnknown":
      return Response.json(
        { error: "Could not determine the audio duration. Please upload a WAV or MP3 file." },
        { status: 422 },
      );
    case "AudioTooShort":
      return Response.json(
        {
          error: `Audio too short (${error.durationSeconds.toFixed(1)}s). Minimum duration is ${error.minSeconds} seconds.`,
        },
        { status: 422 },
      );
    case "StorageUpload":
    case "Database":
      return Response.json({ error: "Failed to create voice. Please retry." }, { status: 500 });
  }
}
