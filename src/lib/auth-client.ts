import { createAuthClient } from "better-auth/react";
import { magicLinkClient, organizationClient } from "better-auth/client/plugins";
import { sentinelClient } from "@better-auth/infra/client";
import { nextCookies } from "better-auth/next-js";
import { env } from "./env";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [magicLinkClient(), organizationClient(), sentinelClient(), nextCookies()],
});

export const signInWithGitHub = async () => {
  await authClient.signIn.social({
    provider: "github",
    callbackURL: "/",
  });
};

export const signInWithGoogle = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: "/",
  });
};