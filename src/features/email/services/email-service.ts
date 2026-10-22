import { Effect } from "effect";
import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";
import { resend } from "@/lib/resend";
import type { EmailContent } from "../lib/auth-email-templates";
import { EmailDeliveryError, EmailNotConfiguredError } from "../domain/errors";

/**
 * Sends an email through Resend. Fails with EmailNotConfiguredError when
 * RESEND_API_KEY is unset, so email-based auth flows fail loudly instead of silently.
 */
export function sendEmail(
  to: string,
  content: EmailContent,
): Effect.Effect<void, EmailNotConfiguredError | EmailDeliveryError> {
  return Effect.gen(function* () {
    const client = resend;
    if (!client) {
      return yield* Effect.fail(new EmailNotConfiguredError({ subject: content.subject }));
    }

    const { error } = yield* Effect.tryPromise({
      try: () =>
        client.emails.send({
          from: env.EMAIL_FROM,
          to,
          subject: content.subject,
          html: content.html,
          text: content.text,
        }),
      catch: (cause) => new EmailDeliveryError({ subject: content.subject, cause }),
    });

    // Resend reports API failures in the result rather than throwing.
    if (error) {
      return yield* Effect.fail(new EmailDeliveryError({ subject: content.subject, cause: error }));
    }
  });
}

/**
 * Adapter for Better Auth's email callbacks, which expect a Promise that rejects on failure.
 */
export function sendEmailOrThrow(to: string, content: EmailContent): Promise<void> {
  return Effect.runPromise(
    sendEmail(to, content).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => Sentry.logger.error("Failed to send auth email", { to, error })),
      ),
    ),
  );
}
