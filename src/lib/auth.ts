import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/index";
import { magicLink, organization } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import * as schema from "@/db/schema";
import { env } from "./env";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...schema }
  }),
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
