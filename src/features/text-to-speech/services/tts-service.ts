import { Effect, Schedule } from "effect";
import { chatterbox } from "@/lib/chatterbox-client";
import { TtsInferenceError, TtsTimeoutError } from "../domain/errors";

class HttpStatusError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface GenerateSpeechOptions {
  readonly prompt: string;
  readonly voiceKey: string;
  readonly temperature?: number;
  readonly topP?: number;
  readonly topK?: number;
  readonly repetitionPenalty?: number;
  readonly normLoudness?: boolean;
}

export interface TtsServiceConfig {
  /** Timeout in milliseconds for the AI inference call. Defaults to 45 seconds (to cover GPU cold starts). */
  readonly timeoutMs?: number;
  /** Number of retry attempts on transient network or server errors. Defaults to 2. */
  readonly maxRetries?: number;
}

/**
 * Executes text-to-speech generation via the Chatterbox microservice.
 * Wrapped in an Effect that provides:
 * 1. Strict typed errors (TtsInferenceError, TtsTimeoutError).
 * 2. Protection against GPU cold starts via timeout cancellation.
 * 3. Automatic retries with exponential backoff on transient network drops.
 */
export function generateSpeech(
  options: GenerateSpeechOptions,
  config?: TtsServiceConfig,
): Effect.Effect<Buffer, TtsInferenceError | TtsTimeoutError> {
  const timeoutMs = config?.timeoutMs ?? 45_000;
  const maxRetries = config?.maxRetries ?? 2;

  // Single inference request attempt
  const singleAttempt = Effect.tryPromise({
    try: async (signal) => {
      const { data, error, response } = await chatterbox.POST("/generate", {
        body: {
          prompt: options.prompt,
          voice_key: options.voiceKey,
          temperature: options.temperature ?? 0.8,
          top_p: options.topP ?? 0.95,
          top_k: options.topK ?? 1000,
          repetition_penalty: options.repetitionPenalty ?? 1.2,
          norm_loudness: options.normLoudness ?? true,
        },
        parseAs: "arrayBuffer",
        signal,
      });

      if (error) {
        throw new HttpStatusError(
          response.status,
          typeof error === "object" && error !== null
            ? JSON.stringify(error)
            : "Chatterbox API rejected the generation request",
        );
      }

      if (!(data instanceof ArrayBuffer)) {
        throw new Error("Chatterbox returned an invalid or empty audio response");
      }

      return Buffer.from(data);
    },
    catch: (cause) =>
      new TtsInferenceError({
        reason: cause instanceof Error ? cause.message : "Failed to generate speech",
        status: cause instanceof HttpStatusError ? cause.status : undefined,
        cause,
      }),
  });

  // Retry schedule: exponential backoff up to maxRetries
  const retrySchedule = Schedule.exponential("500 millis").pipe(
    Schedule.upTo({ times: maxRetries }),
  );

  return singleAttempt.pipe(
    // Enforce an upper bound on each attempt (e.g. 45s)
    Effect.timeoutOrElse({
      duration: `${timeoutMs} millis`,
      orElse: () => Effect.fail(new TtsTimeoutError({ timeoutMs })),
    }),
    // Retry transient failures with backoff; client errors (4xx) are not retried
    Effect.retry({
      schedule: retrySchedule,
      while: (error) =>
        error._tag === "TtsTimeout" || error.status === undefined || error.status >= 500,
    }),
  );
}
