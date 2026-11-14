import { createAuthClient } from "better-auth/react";
import { magicLinkClient, organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { sentinelClient } from "@better-auth/infra/client";
import { env } from "./env";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [
    magicLinkClient(),
    organizationClient(),
    twoFactorClient({
      // A password sign-in for a user with 2FA stops here until they enter a code.
      onTwoFactorRedirect: () => {
        window.location.href = "/auth/two-factor";
      },
    }),
    passkeyClient(),
    sentinelClient(),
  ],
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
