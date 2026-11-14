import { Data } from "effect";
import { TRPCError } from "@trpc/server";
import { appError } from "@/trpc/app-error";
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
 * Thrown when an Organization has started too many Generations in the last minute.
 */
export class GenerationRateLimitedError extends Data.TaggedError("GenerationRateLimited")<{
  readonly orgId: string;
  readonly limitPerMinute: number;
}> {}

/**
 * Thrown when the Generation does not exist or belongs to another Organization.
 */
export class GenerationNotFoundError extends Data.TaggedError("GenerationNotFound")<{
  readonly generationId: string;
}> {}

/**
 * Union of all domain errors that can occur during audio generation.
 */
export type GenerationError =
  | SubscriptionRequiredError
  | BillingServiceError
  | GenerationRateLimitedError
  | VoiceNotFoundError
  | VoiceAudioUnavailableError
  | TtsInferenceError
  | TtsTimeoutError
  | StorageUploadError
  | DatabaseError;

export type DeleteGenerationError = GenerationNotFoundError | DatabaseError;

/**
 * True for failures that point at our infrastructure rather than at the caller, so only
 * these are worth reporting to Sentry.
 */
export function isInfrastructureError(error: GenerationError | DeleteGenerationError): boolean {
  // oxlint-disable-next-line eslint/no-underscore-dangle
  switch (error._tag) {
    case "BillingService":
    case "TtsInference":
    case "TtsTimeout":
    case "StorageUpload":
    case "Database":
      return true;
    case "SubscriptionRequired":
    case "GenerationRateLimited":
    case "GenerationNotFound":
    case "VoiceNotFound":
    case "VoiceAudioUnavailable":
      return false;
  }
}

/**
 * Exhaustively maps any generation error into the appropriate TRPCError.
 * TypeScript guarantees at compile time that all tagged errors are handled.
 */
export function toTRPCError(error: GenerationError | DeleteGenerationError): TRPCError {
  // oxlint-disable-next-line eslint/no-underscore-dangle
  switch (error._tag) {
    case "SubscriptionRequired":
      return appError("SUBSCRIPTION_REQUIRED", "FORBIDDEN", "Subscription required");
    case "GenerationRateLimited":
      return appError(
        "RATE_LIMITED",
        "TOO_MANY_REQUESTS",
        `Your organization can start ${error.limitPerMinute} generations per minute. Try again shortly.`,
      );
    case "GenerationNotFound":
      return new TRPCError({
        code: "NOT_FOUND",
        message: "Generation not found",
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
        message: "Generating speech took too long. Please try again.",
      });
    case "TtsInference":
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Speech generation failed. Please try again.",
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
        message: "Something went wrong on our side. Please try again.",
      });
  }
}
