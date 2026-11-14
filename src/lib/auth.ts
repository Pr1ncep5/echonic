import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { db } from "@/db/index";
import { magicLink } from "better-auth/plugins/magic-link";
import { organization } from "better-auth/plugins/organization";
import { twoFactor } from "better-auth/plugins/two-factor";
import { nextCookies } from "better-auth/next-js";
import { passkey } from "@better-auth/passkey";
import { dash } from "@better-auth/infra";
import * as schema from "@/db/schema";
import { authAuditDatabaseHooks, authAuditHooks } from "@/features/account/services/auth-audit";
import {
  deleteAccountEmail,
  invitationEmail,
  magicLinkEmail,
  resetPasswordEmail,
  verifyEmailEmail,
} from "@/features/email/lib/auth-email-templates";
import { sendEmailOrThrow } from "@/features/email/services/email-service";
import { formatRole } from "@/features/organizations/data/member-roles";
import { findSoleOwnedOrganizations } from "@/features/organizations/services/ownership-service";
import { queueOrganizationAudioDeletion } from "@/features/organizations/services/organization-deletion-service";
import { revokeSubscriptions } from "@/features/billing/services/subscription-service";
import * as Sentry from "@sentry/nextjs";
import { env } from "./env";

export const auth = betterAuth({
  appName: "Echonic",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...schema },
  }),
  rateLimit: {
    // Better Auth only rate-limits in production by default; forced on so dev behaves the same.
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60, // Default window: 1 minute
    max: 100, // Default limit: 100 requests per window
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 5, // Only 5 login attempts per minute to stop brute-forcing
      },
      "/sign-up/email": {
        window: 3600,
        max: 3, // Anti-bot: Only 3 sign-ups per hour per IP
      },
      // Each request sends an email, so the default for /sign-in/* (3 per 10 s) would let
      // one client flood an inbox. Password-reset and verification emails are already
      // limited to 3 per minute by Better Auth.
      "/sign-in/magic-link": {
        window: 60,
        max: 3,
      },
    },
  },
  advanced: {
    ipAddress: {
      // Vercel sets x-real-ip to the client IP and overwrites any value the client sends.
      // Behind another proxy (e.g. Cloudflare) this must change, or rate limits share one bucket.
      ipAddressHeaders: ["x-real-ip"],
      ipv6Subnet: 64, // Rate limit by /64 subnet instead of individual addresses into 1 rate limit bucket
    },
  },
  emailAndPassword: {
    enabled: true,
    // An unverified address proves nothing about who owns it, and invitations are matched
    // by email. Google, GitHub and magic-link sign-ins arrive verified.
    requireEmailVerification: true,
    // Also how Google/GitHub-only users add a password: resetting creates the credential account.
    sendResetPassword: ({ user, url }) => sendEmailOrThrow(user.email, resetPasswordEmail(url)),
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    // Accounts created before verification was required get their link when they sign in.
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: ({ user, url }) => sendEmailOrThrow(user.email, verifyEmailEmail(url)),
  },
  user: {
    // The verification link goes to the new address; the email changes once it is opened.
    changeEmail: { enabled: true },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: ({ user, url }) =>
        sendEmailOrThrow(user.email, deleteAccountEmail(url)),
      beforeDelete: async (user) => {
        const soleOwned = await Effect.runPromise(findSoleOwnedOrganizations(user.id));
        if (soleOwned.length > 0) {
          throw new APIError("BAD_REQUEST", {
            message: `Transfer ownership of or delete ${soleOwned.map((org) => org.name).join(", ")} before deleting your account.`,
          });
        }
      },
    },
  },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      // Linking is only ever started by a signed-in user from Security settings,
      // so their GitHub email may legitimately differ from their Echonic one.
      allowDifferentEmails: true,
    },
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      prompt: "select_account",
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  hooks: authAuditHooks,
  databaseHooks: authAuditDatabaseHooks,
  plugins: [
    magicLink({
      sendMagicLink: ({ email, url }) => sendEmailOrThrow(email, magicLinkEmail(url)),
    }),
    twoFactor({ issuer: "Echonic" }),
    // Passkeys are bound to the domain users see, so they break if APP_URL's host changes.
    passkey({
      rpID: new URL(env.APP_URL).hostname,
      rpName: "Echonic",
      origin: new URL(env.APP_URL).origin,
    }),
    dash(),
    organization({
      // Invitations match by email, so only a proven owner of the address may accept one.
      // Better Auth's default depends on the ID scheme and would flip with a custom generateId.
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: ({ email, role, organization: org, inviter }) =>
        sendEmailOrThrow(
          email,
          invitationEmail({
            organizationName: org.name,
            inviterName: inviter.user.name,
            role: formatRole(role).toLowerCase(),
            // Users without an Organization land on /org-selection, which also lists invitations.
            url: `${env.APP_URL}/settings/organization`,
          }),
        ),
      // Better Auth only clears activeOrganizationId on the session of whoever removed the
      // member or deleted the organization, so clear it on every affected session here.
      organizationHooks: {
        // Once the Organization is gone nobody can open its billing portal, so its
        // Subscription must end first. If Polar cannot be reached the deletion is refused
        // rather than leaving a Subscription that keeps charging.
        beforeDeleteOrganization: async ({ organization: org }) => {
          await Effect.runPromise(
            revokeSubscriptions(org.id).pipe(
              Effect.mapError((error) => {
                Sentry.captureException(error.cause, { tags: { orgId: org.id } });
                return new APIError("BAD_GATEWAY", {
                  message:
                    "We couldn't cancel this organization's subscription, so it was not deleted. Please try again.",
                });
              }),
            ),
          );
        },
        afterRemoveMember: async ({ member, organization: org }) => {
          await db
            .update(schema.session)
            .set({ activeOrganizationId: null })
            .where(
              and(
                eq(schema.session.userId, member.userId),
                eq(schema.session.activeOrganizationId, org.id),
              ),
            );
        },
        afterDeleteOrganization: async ({ organization: org }) => {
          await db
            .update(schema.session)
            .set({ activeOrganizationId: null })
            .where(eq(schema.session.activeOrganizationId, org.id));
          // The Organization is already deleted, so a failure here must not surface as a
          // failed deletion; it is reported so the audio can be removed by hand.
          await Effect.runPromise(
            queueOrganizationAudioDeletion(org.id).pipe(
              Effect.catch((error) =>
                Effect.sync(() =>
                  Sentry.captureException(error.cause, {
                    tags: { orgId: org.id, orphanedAudio: "organization" },
                  }),
                ),
              ),
            ),
          );
        },
      },
    }),
    // Must stay last so cookies set by the other plugins reach server actions.
    nextCookies(),
  ],
});
