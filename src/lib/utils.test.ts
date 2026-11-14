import { describe, expect, it } from "vitest";

import { formatDuration, formatFileSize } from "./utils";

describe("formatFileSize", () => {
  it.each([
    [0, "0 B"],
    [1023, "1023 B"],
    [1024, "1.0 KB"],
    [1536, "1.5 KB"],
    [20 * 1024 * 1024, "20.0 MB"],
  ])("formats %d bytes as %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "00:00"],
    [9.9, "00:09"],
    [75, "01:15"],
    [3600, "60:00"],
  ])("formats %d seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -5])("shows %d as zero", (seconds) => {
    expect(formatDuration(seconds)).toBe("00:00");
  });
});
