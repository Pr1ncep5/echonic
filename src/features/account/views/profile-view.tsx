"use client";

import { useSendVerificationEmail, useSession, useUpdateUser } from "@better-auth-ui/react";
import { BadgeCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InitialsAvatar } from "@/components/initials-avatar";
import { InlineTextSetting } from "@/components/settings/inline-text-setting";
import {
  SettingsGroup,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-group";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeEmailDialog } from "@/features/account/components/change-email-dialog";
import { authClient } from "@/lib/auth-client";

export function ProfileView() {
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const { data: session, isPending } = useSession(authClient);
  const { mutate: updateUser, isPending: isSaving } = useUpdateUser(authClient, {
    onSuccess: () => toast.success("Name updated"),
    onError: (error) => toast.error(error.error?.message ?? "Couldn't update your name"),
  });

  const { mutate: sendVerificationEmail, isPending: isSendingVerification } =
    useSendVerificationEmail(authClient, {
      onSuccess: () => toast.success(`Check ${session?.user.email} for a confirmation link`),
      onError: (error) => toast.error(error.error?.message ?? "Couldn't send the email"),
    });

  const user = session?.user;

  return (
    <>
      <SettingsPageHeader title="Profile" description="How you appear to your teammates." />

      <SettingsGroup>
        {isPending || !user ? (
          <SettingsRow
            className="min-h-20"
            media={<Skeleton className="size-10 rounded-full" />}
            title={<Skeleton className="h-4 w-32" />}
            description={<Skeleton className="mt-1 h-3 w-48" />}
          />
        ) : (
          <SettingsRow
            className="min-h-20"
            media={<InitialsAvatar name={user.name} image={user.image} size="lg" />}
            title={<span className="text-base">{user.name}</span>}
            description={user.email}
          />
        )}
      </SettingsGroup>

      <SettingsSection
        title="Personal information"
        description="Your email is how you sign in and where we send sign-in links."
      >
        <SettingsGroup>
          <InlineTextSetting
            id="profile-name"
            label="Name"
            value={user?.name ?? ""}
            disabled={!user}
            isSaving={isSaving}
            maxLength={32}
            autoComplete="name"
            onSave={(name) => updateUser({ name })}
          />
          <SettingsRow title="Email">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            {user?.emailVerified ? (
              <BadgeCheck className="size-4 text-primary" aria-label="Verified" />
            ) : (
              user && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSendingVerification}
                  onClick={() =>
                    sendVerificationEmail({ email: user.email, callbackURL: "/settings/profile" })
                  }
                >
                  Verify
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!user}
              onClick={() => setChangeEmailOpen(true)}
            >
              Change
            </Button>
          </SettingsRow>
        </SettingsGroup>
      </SettingsSection>

      {user && (
        <ChangeEmailDialog
          open={changeEmailOpen}
          onOpenChange={setChangeEmailOpen}
          currentEmail={user.email}
        />
      )}
    </>
  );
}
