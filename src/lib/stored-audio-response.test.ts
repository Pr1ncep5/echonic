import { describe, expect, it } from "vitest";

import { fakeFetch } from "@/tests/external";
import { env } from "./env";
import { storedAudioResponse } from "./stored-audio-response";

function serve(range?: string) {
  const request = new Request(`${env.APP_URL}/api/audio/abc`, {
    headers: range ? { range } : undefined,
  });
  return storedAudioResponse(request, "generations/orgs/org_1/abc", "private, max-age=3600");
}

describe("storedAudioResponse", () => {
  it("serves the whole object when no range is asked for", async () => {
    const response = await serve();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("audio");
    expect(response.headers.get("content-type")).toBe("audio/wav");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(fakeFetch).toHaveBeenCalledExactlyOnceWith(
      "https://r2.invalid/generations/orgs/org_1/abc",
      { headers: undefined },
    );
  });

  it("forwards the Range header and passes the partial response through", async () => {
    fakeFetch.mockResolvedValueOnce(
      new Response("ud", {
        status: 206,
        headers: {
          "content-type": "audio/wav",
          "content-range": "bytes 1-2/5",
          "content-length": "2",
        },
      }),
    );

    const response = await serve("bytes=1-2");

    expect(fakeFetch).toHaveBeenCalledExactlyOnceWith(expect.any(String), {
      headers: { Range: "bytes=1-2" },
    });
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 1-2/5");
    expect(response.headers.get("content-length")).toBe("2");
    expect(await response.text()).toBe("ud");
  });

  it("answers 416 with the object's size for a range that cannot be satisfied", async () => {
    fakeFetch.mockResolvedValueOnce(
      new Response(null, { status: 416, headers: { "content-range": "bytes */5" } }),
    );

    const response = await serve("bytes=99-");

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */5");
  });

  it("answers 502 without passing on what storage said when storage fails", async () => {
    fakeFetch.mockResolvedValueOnce(new Response("<Error>AccessDenied</Error>", { status: 403 }));

    const response = await serve();

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("AccessDenied");
  });

  it("never serves a stored object as a page, whatever type it was stored with", async () => {
    fakeFetch.mockResolvedValueOnce(
      new Response("<script>alert(1)</script>", { headers: { "content-type": "text/html" } }),
    );

    const response = await serve();

    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain("sandbox");
  });
});
