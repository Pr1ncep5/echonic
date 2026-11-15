import { Effect } from "effect";
import { vi } from "vitest";

import type * as r2 from "@/lib/r2";

/**
 * Stand-ins for the services outside our system: Polar, Chatterbox and R2. setup.ts puts
 * them in place of the real clients for every test. A test describes the outside world with
 * the `given…` functions and can assert on what was sent with the exported spies.
 *
 * They are created once, here, and never inside a `vi.mock` factory: the app's modules are
 * loaded once for the whole run, so every test file must share the same objects.
 */

type SubscriptionState = "active" | "none" | "outage";

let subscriptionState: SubscriptionState = "none";
let chatterboxFailureStatus: number | null = null;

/** The Organization making the request has an active Subscription. */
export function givenSubscription() {
  subscriptionState = "active";
}

/** Polar cannot be reached. Not the same as having no Subscription. */
export function givenPolarOutage() {
  subscriptionState = "outage";
}

/** Chatterbox answers with this HTTP status. 4xx is not retried, so prefer it in tests. */
export function givenChatterboxFails(status: number) {
  chatterboxFailureStatus = status;
}

/** Back to the default: no Subscription, Chatterbox working. Called before each test. */
export function resetExternal() {
  subscriptionState = "none";
  chatterboxFailureStatus = null;
}

export const polarGetState = vi.fn<(orgId: string) => Promise<unknown>>(async (orgId) => {
  switch (subscriptionState) {
    case "active":
      return { id: `polar-customer-${orgId}`, active_subscriptions: [{ id: "sub_test" }] };
    case "none":
      // What Polar answers for an Organization that never subscribed.
      throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
    case "outage":
      throw Object.assign(new Error("Polar is unavailable"), { statusCode: 503 });
  }
});

export const polarIngest = vi.fn<(request: unknown) => Promise<void>>(async () => {});
export const polarRevoke = vi.fn<(subscriptionId: string) => Promise<void>>(async () => {});

export const fakePolar = {
  customers: { getStateExternal: polarGetState },
  subscriptions: { revoke: polarRevoke },
  events: { ingest: polarIngest },
  checkouts: { create: async () => ({ url: "https://polar.invalid/checkout" }) },
  customerSessions: {
    create: async () => ({ customer_portal_url: "https://polar.invalid/portal" }),
  },
};

/** What the Chatterbox client returns for an HTTP error with this status. */
export function chatterboxFailure(status: number) {
  return {
    data: undefined,
    error: { detail: "Chatterbox failed" },
    response: new Response(null, { status }),
  };
}

export const chatterboxPost = vi.fn<(path: string, init: unknown) => Promise<unknown>>(async () =>
  chatterboxFailureStatus === null
    ? { data: new ArrayBuffer(16), error: undefined, response: new Response(null, { status: 200 }) }
    : chatterboxFailure(chatterboxFailureStatus),
);

export const fakeChatterbox = { POST: chatterboxPost };

/**
 * Replaces the global `fetch`. The app's only use of it is reading stored audio back from
 * R2, so by default it answers with a small audio body.
 */
export const fakeFetch = vi.fn<
  (input: string | URL | Request, init?: RequestInit) => Promise<Response>
>(async () => new Response("audio", { headers: { "content-type": "audio/wav" } }));

/** Replaces the functions of `@/lib/r2`; tests reach them with `vi.mocked(uploadAudio)`. */
export const fakeR2 = {
  uploadAudio: vi.fn<typeof r2.uploadAudio>(() => Effect.void),
  deleteAudio: vi.fn<typeof r2.deleteAudio>(async () => {}),
  deleteAudioByPrefix: vi.fn<typeof r2.deleteAudioByPrefix>(async () => {}),
  getSignedAudioUrl: vi.fn<typeof r2.getSignedAudioUrl>(async (key) => `https://r2.invalid/${key}`),
};
