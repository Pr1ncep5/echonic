import { FAKE_URL } from "./env";

/** Steers and inspects the fake Polar from a test. */
export const fakePolar = {
  /** Ends the Organization's Subscription, as if it had never subscribed. */
  async unsubscribe(orgId: string) {
    await fetch(`${FAKE_URL}/__test/subscriptions/${orgId}`, { method: "DELETE" });
  },

  async subscribe(orgId: string) {
    await fetch(`${FAKE_URL}/__test/subscriptions/${orgId}`, { method: "PUT" });
  },

  /** Every Usage event the app has reported so far. */
  async usageEvents(): Promise<
    { name: string; external_id: string; external_customer_id: string }[]
  > {
    const response = await fetch(`${FAKE_URL}/__test/events`);
    return response.json();
  },

  async clearUsageEvents() {
    await fetch(`${FAKE_URL}/__test/events`, { method: "DELETE" });
  },
};
