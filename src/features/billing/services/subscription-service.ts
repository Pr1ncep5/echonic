import { Effect } from "effect";
import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { isPolarNotFound, polar } from "@/lib/polar";
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
 * Ingests a Polar usage event after the paid work has succeeded.
 * Never fails: a metering outage must not undo work the customer already received.
 */
export function recordUsageEvent(orgId: string, event: UsageEvent): Effect.Effect<void> {
  return Effect.tryPromise(() =>
    polar.events.ingest({
      events: [
        {
          name: event.name,
          external_id: event.externalId,
          external_customer_id: orgId,
          metadata: event.metadata ?? {},
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  ).pipe(
    Effect.asVoid,
    Effect.catch((error) =>
      Effect.sync(() =>
        Sentry.logger.warn("Failed to ingest Polar usage event", {
          orgId,
          eventName: event.name,
          externalId: event.externalId,
          error,
        }),
      ),
    ),
  );
}

/**
 * Records a usage event once the response has been sent, without delaying it.
 * Uses Next's `after` rather than a detached fiber: serverless hosts can freeze the
 * instance as soon as the response is sent, losing the event, while `after` keeps the
 * request alive until it finishes. Must be called while handling a request.
 */
export function scheduleUsageEvent(orgId: string, event: UsageEvent): Effect.Effect<void> {
  return Effect.sync(() => after(() => Effect.runPromise(recordUsageEvent(orgId, event))));
}
