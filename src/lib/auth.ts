import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { db } from "@/db/index";
import { magicLink, organization, twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { dash } from "@better-auth/infra";
import * as schema from "@/db/schema";
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
import { env } from "./env";

export const auth = betterAuth({
  appName: "Echonic",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...schema },
  }),
  rateLimit: {
    enabled: true, // Development mode
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
    },
  },
  advanced: {
    ipAddress: {
      ipv6Subnet: 64, // Rate limit by /64 subnet instead of individual addresses into 1 rate limit bucket
    },
  },
  emailAndPassword: {
    enabled: true,
    // Also how Google/GitHub-only users add a password: resetting creates the credential account.
    sendResetPassword: ({ user, url }) => sendEmailOrThrow(user.email, resetPasswordEmail(url)),
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
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
        },
      },
    }),
  ],
});
