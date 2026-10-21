import { Data } from "effect";
import { TRPCError } from "@trpc/server";
import type {
  BillingServiceError,
  SubscriptionRequiredError,
} from "@/features/billing/domain/errors";
import type { DatabaseError } from "@/db/errors";
import type { StorageUploadError } from "@/lib/r2";

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
