import { describe, expect, it } from "vitest";

import { env } from "@/lib/env";
import { polarIngest } from "@/tests/external";
import { queuedTasks, queueTask, usageEvent } from "@/tests/outbox";
import { GET } from "./route";

function callCron(authorization?: string) {
  return GET(
    new Request(`${env.APP_URL}/api/cron/outbox`, {
      headers: authorization ? { authorization } : undefined,
    }),
  );
}

describe("GET /api/cron/outbox", () => {
  it.each([
    ["no Authorization header", undefined],
    ["a wrong secret", "Bearer not-the-secret"],
    ["the secret without the Bearer scheme", env.CRON_SECRET],
  ])("rejects %s and performs nothing", async (_case, authorization) => {
    await queueTask(usageEvent("org_1", "generation_1"));

    const response = await callCron(authorization);

    expect(response.status).toBe(401);
    expect(polarIngest).not.toHaveBeenCalled();
    expect(await queuedTasks()).toHaveLength(1);
  });

  it("drains the outbox for the right secret and reports what it did", async () => {
    await queueTask(usageEvent("org_1", "generation_1"));

    const response = await callCron(`Bearer ${env.CRON_SECRET}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 1, failed: 0 });
    expect(await queuedTasks()).toEqual([]);
  });
});
