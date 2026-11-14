import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { env } from "@/lib/env";
import { proxy } from "./proxy";

function visit(path: string, cookie?: string) {
  return proxy(
    new NextRequest(new URL(path, env.APP_URL), { headers: cookie ? { cookie } : undefined }),
  );
}

function redirectTarget(response: Response) {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
}

describe("proxy", () => {
  it.each(["/", "/text-to-speech", "/api/trpc/voices.getAll", "/api/audio/abc"])(
    "sends a visitor without a session cookie from %s to sign-in",
    async (path) => {
      expect(redirectTarget(await visit(path))).toBe("/auth/sign-in");
    },
  );

  it.each(["/auth/sign-in", "/api/auth/session", "/api/cron/outbox", "/monitoring"])(
    "lets anyone reach %s",
    async (path) => {
      expect(redirectTarget(await visit(path))).toBeNull();
    },
  );

  it("does not treat a path that only starts like a public one as public", async () => {
    expect(redirectTarget(await visit("/authors"))).toBe("/auth/sign-in");
    expect(redirectTarget(await visit("/api/cronjobs"))).toBe("/auth/sign-in");
  });

  it("lets a visitor with a session cookie through", async () => {
    const response = await visit("/text-to-speech", "better-auth.session_token=abc.def");

    expect(redirectTarget(response)).toBeNull();
  });
});
