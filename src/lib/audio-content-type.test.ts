import { describe, expect, it } from "vitest";

import { audioResponseHeaders, isAudioContentType } from "./audio-content-type";

describe("isAudioContentType", () => {
  it.each(["audio/wav", "audio/mpeg", "audio/x-m4a", "AUDIO/WEBM"])("accepts %s", (type) => {
    expect(isAudioContentType(type)).toBe(true);
  });

  it.each(["text/html", "application/octet-stream", "audio/", "audio/wav; codecs=1", ""])(
    "rejects %j",
    (type) => {
      expect(isAudioContentType(type)).toBe(false);
    },
  );
});

describe("stored audio can never be rendered as a page", () => {
  it("keeps an audio type as stored", () => {
    expect(audioResponseHeaders("audio/mpeg", "private")).toMatchObject({
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private",
    });
  });

  it.each(["text/html", "image/svg+xml", null])("serves %j as a plain download", (storedType) => {
    expect(audioResponseHeaders(storedType, "private")).toMatchObject({
      "Content-Type": "application/octet-stream",
    });
  });

  it("always forbids sniffing and sandboxes the response", () => {
    expect(audioResponseHeaders("audio/wav", "private")).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });
  });
});
