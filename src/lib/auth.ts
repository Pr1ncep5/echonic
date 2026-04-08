import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/index";
import { magicLink, organization } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import * as schema from "@/db/schema";
import { env } from "./env";

export const auth = betterAuth({
  appName: "Echonic",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...schema }
  }),
  rateLimit: {
    enabled: true, // Development mode 
    storage: "database",
    modelName: "rateLimit", 
    window: 60,          // Default window: 1 minute
    max: 100,            // Default limit: 100 requests per window
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 5,      // Only 5 login attempts per minute to stop brute-forcing
      },
      "/sign-up/email": {
        window: 3600,
        max: 3,      // Anti-bot: Only 3 sign-ups per hour per IP
      }
    }
  },
  advanced: {
    ipAddress: {
      ipv6Subnet: 64, // Rate limit by /64 subnet instead of individual addresses into 1 rate limit bucket
    },
  },
  emailAndPassword: {
    enabled: true,
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
      sendMagicLink: async ({ email, token, url, metadata }, ctx) => { },
    }),
    dash(),
    organization(),
  ],
});
