import { FAKE_URL } from "./env";

export interface UsageEvent {
  name: string;
  external_id: string;
  external_customer_id: string;
}

/**
 * Steers and inspects the fake Polar for one Organization. Everything is scoped to that
 * Organization, so journeys running in parallel do not see each other's state.
 */
export function polarFor(orgId: string) {
  const subscription = `${FAKE_URL}/__test/subscriptions/${orgId}`;

  return {
    /** Ends the Subscription, as if the Organization had never subscribed. */
    async unsubscribe() {
      await fetch(subscription, { method: "DELETE" });
    },

    async isSubscribed(): Promise<boolean> {
      const response = await fetch(subscription);
      const state: { subscribed: boolean } = await response.json();
      return state.subscribed;
    },

    /** The Usage events the app has reported for this Organization so far. */
    async usageEvents(): Promise<UsageEvent[]> {
      const response = await fetch(`${FAKE_URL}/__test/events`);
      const events: UsageEvent[] = await response.json();
      return events.filter((event) => event.external_customer_id === orgId);
    },
  };
}

export type FakePolar = ReturnType<typeof polarFor>;
