import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { chatterboxFailure, chatterboxPost } from "@/tests/external";
import { TtsInferenceError, TtsTimeoutError } from "../domain/errors";
import { generateSpeech, type TtsServiceConfig } from "./tts-service";

// One retry keeps the real backoff (500 ms) to a single wait per test.
function speak(config: TtsServiceConfig = { maxRetries: 1 }) {
  return generateSpeech({ prompt: "Hello world", voiceKey: "voices/system/abc" }, config);
}

describe("generateSpeech", () => {
  it("sends the text, the Voice's audio key and the settings to Chatterbox", async () => {
    const audio = await Effect.runPromise(
      generateSpeech({
        prompt: "Hello world",
        voiceKey: "voices/system/abc",
        temperature: 0.5,
        topP: 0.9,
        topK: 500,
        repetitionPenalty: 1.5,
      }),
    );

    expect(audio).toBeInstanceOf(Buffer);
    expect(chatterboxPost).toHaveBeenCalledExactlyOnceWith(
      "/generate",
      expect.objectContaining({
        body: {
          prompt: "Hello world",
          voice_key: "voices/system/abc",
          temperature: 0.5,
          top_p: 0.9,
          top_k: 500,
          repetition_penalty: 1.5,
          norm_loudness: true,
        },
      }),
    );
  });

  it("does not retry a request Chatterbox rejected (4xx)", async () => {
    chatterboxPost.mockResolvedValue(chatterboxFailure(422));

    const error = await Effect.runPromise(Effect.flip(speak()));

    expect(error).toBeInstanceOf(TtsInferenceError);
    expect(error).toMatchObject({ status: 422 });
    expect(chatterboxPost).toHaveBeenCalledTimes(1);
  });

  it("retries a server error (5xx) and succeeds when Chatterbox recovers", async () => {
    chatterboxPost.mockResolvedValueOnce(chatterboxFailure(503));

    const audio = await Effect.runPromise(speak());

    expect(audio).toBeInstanceOf(Buffer);
    expect(chatterboxPost).toHaveBeenCalledTimes(2);
  });

  it("retries a dropped connection", async () => {
    chatterboxPost.mockRejectedValueOnce(new TypeError("fetch failed"));

    const audio = await Effect.runPromise(speak());

    expect(audio).toBeInstanceOf(Buffer);
    expect(chatterboxPost).toHaveBeenCalledTimes(2);
  });

  it("gives up after the allowed retries", async () => {
    chatterboxPost.mockResolvedValue(chatterboxFailure(500));

    const error = await Effect.runPromise(Effect.flip(speak({ maxRetries: 1 })));

    expect(error).toBeInstanceOf(TtsInferenceError);
    expect(chatterboxPost).toHaveBeenCalledTimes(2);
  });

  it("fails with a timeout when Chatterbox does not answer in time", async () => {
    chatterboxPost.mockImplementation(() => new Promise(() => {}));

    const error = await Effect.runPromise(Effect.flip(speak({ timeoutMs: 20, maxRetries: 0 })));

    expect(error).toBeInstanceOf(TtsTimeoutError);
  });
});
