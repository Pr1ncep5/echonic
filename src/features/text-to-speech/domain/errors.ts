import { Data } from "effect";
import { TRPCError } from "@trpc/server";

/**
 * Thrown when the active organization does not have an active Polar subscription.
 */
export class SubscriptionRequiredError extends Data.TaggedError("SubscriptionRequired")<{
  readonly orgId: string;
}> {}

/**
 * Thrown when communication with Polar fails (network error, API down, etc.).
 */
export class BillingServiceError extends Data.TaggedError("BillingService")<{
  readonly orgId: string;
  readonly cause: unknown;
}> {}

/**
 * Thrown when the requested voice ID cannot be found or does not belong to the user's org.
 */
export class VoiceNotFoundError extends Data.TaggedError("VoiceNotFound")<{
  readonly voiceId: string;
}> {}

/**
 * Thrown when a voice exists in the database but does not have a reference audio sample in R2.
 */
export class VoiceAudioUnavailableError extends Data.TaggedError("VoiceAudioUnavailable")<{
  readonly voiceId: string;
}> {}

/**
 * Thrown when Chatterbox TTS microservice fails or returns invalid audio data.
 */
export class TtsInferenceError extends Data.TaggedError("TtsInference")<{
  readonly reason: string;
  /** HTTP status returned by the microservice, when the failure was an HTTP response. */
  readonly status?: number;
  readonly cause?: unknown;
}> {}

/**
 * Thrown when Chatterbox TTS generation exceeds the allowed time limit.
 */
export class TtsTimeoutError extends Data.TaggedError("TtsTimeout")<{
  readonly timeoutMs: number;
}> {}

/**
 * Thrown when uploading generated audio to Cloudflare R2 fails.
 */
export class StorageUploadError extends Data.TaggedError("StorageUpload")<{
  readonly key: string;
  readonly cause: unknown;
}> {}

/**
 * Thrown when deleting an object from Cloudflare R2 fails.
 */
export class StorageDeleteError extends Data.TaggedError("StorageDelete")<{
  readonly key: string;
  readonly cause: unknown;
}> {}

/**
 * Thrown when a database operation (insert, update, delete) fails.
 */
export class DatabaseError extends Data.TaggedError("Database")<{
  readonly operation: "select" | "insert" | "update" | "delete";
  readonly entity: "generation" | "voice";
  readonly cause: unknown;
}> {}

/**
 * Union of all domain errors that can occur during audio generation.
 */
export type GenerationError =
  | SubscriptionRequiredError
  | BillingServiceError
  | VoiceNotFoundError
  | VoiceAudioUnavailableError
  | TtsInferenceError
  | TtsTimeoutError
  | StorageUploadError
  | StorageDeleteError
  | DatabaseError;

/**
 * Exhaustively maps any GenerationError into the appropriate TRPCError.
 * TypeScript guarantees at compile time that all tagged errors are handled.
 */
export function toTRPCError(error: GenerationError): TRPCError {
  // oxlint-disable-next-line eslint/no-underscore-dangle
  switch (error._tag) {
    case "SubscriptionRequired":
      return new TRPCError({
        code: "FORBIDDEN",
        message: "SUBSCRIPTION_REQUIRED",
      });
    case "VoiceNotFound":
      return new TRPCError({
        code: "NOT_FOUND",
        message: "Voice not found",
      });
    case "VoiceAudioUnavailable":
      return new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Voice audio not available",
      });
    case "TtsTimeout":
      return new TRPCError({
        code: "TIMEOUT",
        message: `TTS inference timed out after ${error.timeoutMs}ms`,
      });
    case "TtsInference":
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.reason,
      });
    case "StorageUpload":
    case "StorageDelete":
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to store generated audio",
      });
    case "BillingService":
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to communicate with billing service",
      });
    case "Database":
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database transaction failed",
      });
  }
}
