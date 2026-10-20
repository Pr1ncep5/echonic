import { Effect, Schedule } from "effect";
import { chatterbox } from "@/lib/chatterbox-client";
import { TtsInferenceError, TtsTimeoutError } from "../domain/errors";

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
    try: async () => {
      const { data, error } = await chatterbox.POST("/generate", {
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
      });

      if (error) {
        throw new Error(
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
        cause,
      }),
  });

  // Retry schedule: exponential backoff up to maxRetries
  const retrySchedule = Schedule.exponential("500 millis").pipe(
    Schedule.upTo({ times: maxRetries }),
  );

  return singleAttempt.pipe(
    // Retry transient network/service failures with backoff
    Effect.retry(retrySchedule),
    // Enforce strict upper bound on execution time (e.g. 45s)
    Effect.timeoutOrElse({
      duration: `${timeoutMs} millis`,
      orElse: () => Effect.fail(new TtsTimeoutError({ timeoutMs })),
    }),
  );
}
