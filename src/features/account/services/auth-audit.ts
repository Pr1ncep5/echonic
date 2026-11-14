import { APIError, createAuthMiddleware } from "better-auth/api";
import type { BetterAuthOptions } from "better-auth";
import * as Sentry from "@sentry/nextjs";

const AUDITED_PATHS = new Set([
  "/change-password",
  "/reset-password",
  "/change-email",
  "/verify-email",
  "/two-factor/enable",
  "/two-factor/disable",
  "/unlink-account",
  "/revoke-sessions",
  "/revoke-other-sessions",
]);

export const authAuditHooks = {
  after: createAuthMiddleware(async (ctx) => {
    if (!AUDITED_PATHS.has(ctx.path) || ctx.context.returned instanceof APIError) {
      return;
    }
    Sentry.logger.info("Auth action", {
      action: ctx.path,
      userId: ctx.context.session?.user.id ?? ctx.context.newSession?.user.id,
    });
  }),
} satisfies BetterAuthOptions["hooks"];

export const authAuditDatabaseHooks = {
  session: {
    create: {
      after: async (session) => {
        Sentry.logger.info("Session created", {
          userId: session.userId,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
        });
      },
    },
  },
  account: {
    create: {
      after: async (account) => {
        Sentry.logger.info("Sign-in method linked", {
          userId: account.userId,
          providerId: account.providerId,
        });
      },
    },
  },
  user: {
    delete: {
      after: async (user) => {
        Sentry.logger.info("User deleted", { userId: user.id });
      },
    },
  },
} satisfies BetterAuthOptions["databaseHooks"];
