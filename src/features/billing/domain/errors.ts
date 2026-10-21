import { Data } from "effect";

/**
 * Thrown when the active organization does not have an active Polar subscription.
 */
export class SubscriptionRequiredError extends Data.TaggedError("SubscriptionRequired")<{
  readonly orgId: string;
}> {}

/**
 * Thrown when communication with Polar fails (network error, API down, etc.).
 */
export class BillingServiceError extends Data.TaggedError("BillingService")<{
  readonly orgId: string;
  readonly cause: unknown;
}> {}
