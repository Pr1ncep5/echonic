import { describe, expect, it } from "vitest";

import { describeUserAgent } from "./describe-user-agent";

const chromeOnWindows =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

describe("describeUserAgent", () => {
  it.each([
    [chromeOnWindows, "Chrome on Windows", false],
    // Edge and Opera also say "Chrome"; Chrome also says "Safari".
    [`${chromeOnWindows} Edg/130.0.0.0`, "Edge on Windows", false],
    [`${chromeOnWindows} OPR/115.0.0.0`, "Opera on Windows", false],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
      "Safari on macOS",
      false,
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Safari on iOS",
      true,
    ],
    [
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
      "Chrome on Android",
      true,
    ],
    [
      "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
      "Firefox on Linux",
      false,
    ],
  ])("describes %s", (userAgent, label, isMobile) => {
    expect(describeUserAgent(userAgent)).toEqual({ label, isMobile });
  });

  it.each([null, undefined, "", "curl/8.0"])("calls %j an unknown device", (userAgent) => {
    expect(describeUserAgent(userAgent)).toEqual({ label: "Unknown device", isMobile: false });
  });
});
