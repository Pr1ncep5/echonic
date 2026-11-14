import { vi } from "vitest";

/**
 * Stand-ins for the services outside our system: Polar and Chatterbox. setup.ts puts them
 * in place of the real clients for every test. A test describes the outside world with the
 * `given…` functions and can assert on what was sent with the exported spies.
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

export const chatterboxPost = vi.fn<(path: string, init: unknown) => Promise<unknown>>(async () =>
  chatterboxFailureStatus === null
    ? { data: new ArrayBuffer(16), error: undefined, response: new Response(null, { status: 200 }) }
    : {
        data: undefined,
        error: { detail: "Chatterbox failed" },
        response: new Response(null, { status: chatterboxFailureStatus }),
      },
);

export const fakeChatterbox = { POST: chatterboxPost };
