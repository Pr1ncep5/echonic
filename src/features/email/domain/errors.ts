import { Data } from "effect";

/**
 * Thrown when production has no RESEND_API_KEY, so auth emails cannot be sent.
 */
export class EmailNotConfiguredError extends Data.TaggedError("EmailNotConfigured")<{
  readonly subject: string;
}> {}

/**
 * Thrown when Resend rejects or fails to send an email.
 */
export class EmailDeliveryError extends Data.TaggedError("EmailDelivery")<{
  readonly subject: string;
  readonly cause: unknown;
}> {}
