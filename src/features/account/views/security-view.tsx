"use client";

import {
  useListSessions,
  useRevokeOtherSessions,
  useRevokeSession,
  useSession,
} from "@better-auth-ui/react";
import { formatDistanceToNow } from "date-fns";
import { Laptop, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  SettingsGroup,
  SettingsIconTile,
  SettingsPageHeader,
  SettingsRow,
  SettingsRowButton,
  SettingsSection,
} from "@/components/settings/settings-group";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteAccountSection } from "@/features/account/components/delete-account-section";
import { PasskeysSection } from "@/features/account/components/passkeys-section";
import { SignInMethodsSection } from "@/features/account/components/sign-in-methods-section";
import { TwoFactorSection } from "@/features/account/components/two-factor-section";
import { describeUserAgent } from "@/features/account/lib/describe-user-agent";
import { authClient } from "@/lib/auth-client";

export function SecurityView() {
  const { data: session } = useSession(authClient);
  const { data: sessions, isPending: isSessionsPending } = useListSessions(authClient);

  const { mutate: revokeSession, isPending: isRevoking } = useRevokeSession(authClient, {
    onError: (error) => toast.error(error.error?.message ?? "Couldn't sign out that device"),
  });
  const { mutate: revokeOtherSessions, isPending: isRevokingOthers } = useRevokeOtherSessions(
    authClient,
    {
      onSuccess: () => toast.success("Signed out of all other devices"),
      onError: (error) => toast.error(error.error?.message ?? "Couldn't sign out other devices"),
    },
  );

  const currentToken = session?.session.token;
  const sortedSessions = (sessions ?? []).toSorted((a, b) =>
    a.token === currentToken ? -1 : b.token === currentToken ? 1 : 0,
  );

  return (
    <>
      <SettingsPageHeader title="Security" description="How you sign in, and where." />

      <SignInMethodsSection />
      <PasskeysSection />
      <TwoFactorSection />

      <SettingsSection title="Devices">
        <SettingsGroup>
          {isSessionsPending ? (
            <SettingsRow
              media={<Skeleton className="size-8 rounded-md" />}
              title={<Skeleton className="h-4 w-36" />}
            />
          ) : (
            sortedSessions.map((item) => {
              const device = describeUserAgent(item.userAgent);
              const isCurrent = item.token === currentToken;
              return (
                <SettingsRow
                  key={item.id}
                  media={
                    <SettingsIconTile>
                      {device.isMobile ? <Smartphone /> : <Laptop />}
                    </SettingsIconTile>
                  }
                  title={device.label}
                  description={
                    isCurrent
                      ? "This device"
                      : `Active ${formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}`
                  }
                >
                  {!isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRevoking}
                      onClick={() => revokeSession({ token: item.token })}
                    >
                      Sign out
                    </Button>
                  )}
                </SettingsRow>
              );
            })
          )}
          {sortedSessions.length > 1 && (
            <SettingsRowButton
              title={<span className="text-primary">Sign out of all other devices</span>}
              disabled={isRevokingOthers}
              onClick={() => revokeOtherSessions()}
            />
          )}
        </SettingsGroup>
      </SettingsSection>

      <DeleteAccountSection />
    </>
  );
}
