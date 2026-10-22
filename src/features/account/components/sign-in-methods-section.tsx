"use client";

import {
  GitHub,
  Google,
  useLinkSocial,
  useListAccounts,
  useRequestPasswordReset,
  useSession,
  useUnlinkAccount,
} from "@better-auth-ui/react";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  SettingsGroup,
  SettingsIconTile,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-group";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePasswordDialog } from "@/features/account/components/change-password-dialog";
import { authClient } from "@/lib/auth-client";

const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google", Icon: Google },
  { id: "github", label: "GitHub", Icon: GitHub },
] as const;

export function SignInMethodsSection() {
  const [passwordOpen, setPasswordOpen] = useState(false);

  const { data: session } = useSession(authClient);
  const { data: accounts, isPending } = useListAccounts(authClient);

  const { mutate: linkSocial, isPending: isLinking } = useLinkSocial(authClient, {
    onError: (error) => toast.error(error.error?.message ?? "Couldn't connect that account"),
  });
  const { mutate: unlinkAccount, isPending: isUnlinking } = useUnlinkAccount(authClient, {
    onError: (error) => toast.error(error.error?.message ?? "Couldn't disconnect that account"),
  });
  const { mutate: requestPasswordReset, isPending: isRequestingReset } = useRequestPasswordReset(
    authClient,
    {
      onSuccess: () => toast.success(`We sent a link to ${session?.user.email} to set a password`),
      onError: (error) => toast.error(error.error?.message ?? "Couldn't send the email"),
    },
  );

  const hasPassword = accounts?.some((account) => account.providerId === "credential");
  // Better Auth refuses to unlink the last way to sign in; mirror that so the button isn't a trap.
  const signInMethodCount = accounts?.length ?? 0;

  if (isPending) {
    return (
      <SettingsSection title="Sign-in methods">
        <SettingsGroup>
          <SettingsRow
            media={<Skeleton className="size-8 rounded-md" />}
            title={<Skeleton className="h-4 w-36" />}
          />
        </SettingsGroup>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="Sign-in methods"
      description="You can also sign in with a link sent to your email."
    >
      <SettingsGroup>
        <SettingsRow
          media={
            <SettingsIconTile>
              <KeyRound />
            </SettingsIconTile>
          }
          title="Password"
          description={hasPassword ? "Set" : "Not set"}
        >
          {hasPassword ? (
            <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
              Change
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={!session || isRequestingReset}
              onClick={() =>
                session &&
                requestPasswordReset({
                  email: session.user.email,
                  redirectTo: "/auth/reset-password",
                })
              }
            >
              Set password
            </Button>
          )}
        </SettingsRow>

        {SOCIAL_PROVIDERS.map(({ id, label, Icon }) => {
          const account = accounts?.find((item) => item.providerId === id);
          return (
            <SettingsRow
              key={id}
              media={
                <SettingsIconTile>
                  <Icon />
                </SettingsIconTile>
              }
              title={label}
              description={account ? "Connected" : "Not connected"}
            >
              {account ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isUnlinking || signInMethodCount <= 1}
                  title={signInMethodCount <= 1 ? "This is your only way to sign in" : undefined}
                  // Better Auth expects its own account row id here, not the provider's account id.
                  onClick={() => unlinkAccount({ accountId: account.id })}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLinking}
                  onClick={() => linkSocial({ provider: id, callbackURL: "/settings/security" })}
                >
                  Connect
                </Button>
              )}
            </SettingsRow>
          );
        })}
      </SettingsGroup>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </SettingsSection>
  );
}
