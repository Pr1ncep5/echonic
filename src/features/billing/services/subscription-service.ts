import { Effect } from "effect";

import { isPolarNotFound, polar } from "@/lib/polar";
import type { OutboxTask } from "@/features/outbox/domain/tasks";
import { BillingServiceError, SubscriptionRequiredError } from "../domain/errors";

export type CustomerState = Awaited<ReturnType<typeof polar.customers.getStateExternal>>;

export interface UsageEvent {
  readonly name: string;
  /** Polar deduplicates on this, so a retried ingest cannot double-bill. */
  readonly externalId: string;
  readonly metadata?: Record<string, string | number | boolean>;
}

/**
 * Fetches the Polar customer state for an Organization.
 * Resolves to `null` when the Organization has no Polar customer yet (404), which is
 * a normal state for an Organization that never subscribed, not a failure.
 */
export function getCustomerState(
  orgId: string,
): Effect.Effect<CustomerState | null, BillingServiceError> {
  return Effect.tryPromise({
    try: () => polar.customers.getStateExternal(orgId),
    catch: (cause) => new BillingServiceError({ orgId, cause }),
  }).pipe(
    Effect.catchIf(
      (error) => isPolarNotFound(error.cause),
      () => Effect.succeed(null),
    ),
  );
}

export function hasActiveSubscription(state: CustomerState | null): boolean {
  return (state?.active_subscriptions ?? []).length > 0;
}

/**
 * Fails with SubscriptionRequiredError unless the Organization has an active subscription.
 * A Polar outage fails with BillingServiceError instead, so it is never mistaken for
 * a missing subscription.
 */
export function verifySubscription(
  orgId: string,
): Effect.Effect<void, SubscriptionRequiredError | BillingServiceError> {
  return Effect.gen(function* () {
    const state = yield* getCustomerState(orgId);
    if (!hasActiveSubscription(state)) {
      return yield* Effect.fail(new SubscriptionRequiredError({ orgId }));
    }
  });
}

/**
 * The outbox task that reports a Usage event to Polar. Insert it in the same transaction
 * as the row for the paid work: the event is then recorded if and only if the work was,
 * and a Polar outage delays billing instead of losing it.
 */
export function usageEventTask(orgId: string, event: UsageEvent): OutboxTask {
  return {
    kind: "USAGE_EVENT",
    payload: {
      orgId,
      name: event.name,
      externalId: event.externalId,
      metadata: event.metadata ?? {},
      occurredAt: new Date().toISOString(),
    },
  };
}

/**
 * Ends every active Subscription of an Organization immediately. Used before the
 * Organization is deleted, because afterwards nobody could reach its billing portal.
 */
export function revokeSubscriptions(orgId: string): Effect.Effect<void, BillingServiceError> {
  return Effect.gen(function* () {
    const state = yield* getCustomerState(orgId);
    for (const subscription of state?.active_subscriptions ?? []) {
      yield* Effect.tryPromise({
        try: () => polar.subscriptions.revoke(subscription.id),
        catch: (cause) => new BillingServiceError({ orgId, cause }),
      });
    }
  });
}
