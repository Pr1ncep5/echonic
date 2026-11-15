/**
 * One small server standing in for Chatterbox and Polar during end-to-end tests.
 * Started by Playwright (see playwright.config.ts) with `bun e2e/fakes/server.ts`.
 *
 * Tests steer and inspect it through the /__test routes (see e2e/support/fake.ts).
 * Every Organization has a Subscription until a test says otherwise.
 */
import { serve } from "bun";

import type { paths } from "@/types/chatterbox-api";
import { wavOfSeconds } from "@/tests/audio";
import { APP_URL, FAKE_PORT } from "../support/env";

type GenerateBody = paths["/generate"]["post"]["requestBody"]["content"]["application/json"];

/** Type this in the text to make Chatterbox reject the request (4xx, so it is not retried). */
const FAIL_MARKER = "[fail]";

const unsubscribed = new Set<string>();
const ingestedEvents: unknown[] = [];

function customerState(request: Request, orgId: string): Response {
  if (request.method !== "GET") return new Response(null, { status: 405 });
  if (unsubscribed.has(orgId)) {
    return Response.json({ error: "ResourceNotFound", detail: "Not found" }, { status: 404 });
  }
  return Response.json({
    id: `polar-customer-${orgId}`,
    external_id: orgId,
    active_subscriptions: [{ id: `sub-${orgId}`, meters: [] }],
  });
}

async function generate(request: Request): Promise<Response> {
  if (!request.headers.get("x-api-key")) {
    return Response.json({ detail: "Missing API key" }, { status: 401 });
  }
  // Typed from the generated API types, so `bun run sync-api` breaks this file at
  // type-check when the real request changes.
  const body: GenerateBody = await request.json();
  if (body.prompt.includes(FAIL_MARKER)) {
    return Response.json({ detail: "Rejected by the fake" }, { status: 422 });
  }
  return new Response(new Uint8Array(wavOfSeconds(1)), {
    headers: { "content-type": "audio/wav" },
  });
}

async function route(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  const method = request.method;

  // Chatterbox
  if (method === "POST" && pathname === "/generate") return generate(request);

  // Polar
  const state = pathname.match(/^\/v1\/customers\/external\/([^/]+)\/state$/);
  if (state?.[1]) return customerState(request, decodeURIComponent(state[1]));

  if (method === "POST" && pathname === "/v1/events/ingest") {
    const body: { events: unknown[] } = await request.json();
    ingestedEvents.push(...body.events);
    return Response.json({ inserted: body.events.length });
  }
  if (method === "POST" && pathname === "/v1/checkouts/") {
    return Response.json({ url: `${APP_URL}/?checkout=fake` });
  }
  if (method === "POST" && pathname === "/v1/customer-sessions/") {
    return Response.json({ customer_portal_url: `${APP_URL}/?portal=fake` });
  }
  const subscription = pathname.match(/^\/v1\/subscriptions\/sub-(.+)$/);
  if (method === "DELETE" && subscription?.[1]) {
    unsubscribed.add(decodeURIComponent(subscription[1]));
    return Response.json({ id: `sub-${subscription[1]}`, status: "canceled" });
  }

  // Test control
  const control = pathname.match(/^\/__test\/subscriptions\/([^/]+)$/);
  if (control?.[1]) {
    const orgId = decodeURIComponent(control[1]);
    if (method === "PUT") unsubscribed.delete(orgId);
    if (method === "DELETE") unsubscribed.add(orgId);
    return Response.json({ orgId, subscribed: !unsubscribed.has(orgId) });
  }
  // Never cleared: journeys run in parallel and each reads only its own Organization's.
  if (pathname === "/__test/events") return Response.json(ingestedEvents);
  if (pathname === "/__test/health") return new Response("ok");

  return Response.json(
    { detail: `The fake has no route for ${method} ${pathname}` },
    { status: 501 },
  );
}

serve({ port: FAKE_PORT, fetch: route });
