"use client";

import { useDeleteUser, useSession, useSignOut } from "@better-auth-ui/react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import {
  SettingsGroup,
  SettingsIconTile,
  SettingsRowButton,
  SettingsSection,
} from "@/components/settings/settings-group";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

export function DeleteAccountSection() {
  const router = useRouter();
  const trpc = useTRPC();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: session } = useSession(authClient);
  const { data: soleOwned } = useQuery(trpc.account.getSoleOwnedOrganizations.queryOptions());

  const { mutate: signOut, isPending: isSigningOut } = useSignOut(authClient, {
    onSuccess: () => router.push("/auth/sign-in"),
  });
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser(authClient, {
    onSuccess: () =>
      toast.success(`Check ${session?.user.email} for a link to confirm deleting your account`),
    onError: (error) => toast.error(error.error?.message ?? "Couldn't start account deletion"),
  });

  const blockingOrganizations = soleOwned ?? [];
  const isBlocked = blockingOrganizations.length > 0;

  return (
    <SettingsSection
      title="Danger zone"
      description={
        isBlocked
          ? `You're the only owner of ${blockingOrganizations.map((org) => org.name).join(", ")}. Make someone else an owner, or delete it, before deleting your account.`
          : undefined
      }
    >
      <SettingsGroup>
        <SettingsRowButton
          media={
            <SettingsIconTile tone="destructive">
              <LogOut />
            </SettingsIconTile>
          }
          title="Sign out"
          tone="destructive"
          disabled={isSigningOut}
          onClick={() => signOut()}
        />
        <SettingsRowButton
          media={
            <SettingsIconTile tone="destructive">
              <Trash2 />
            </SettingsIconTile>
          }
          title="Delete account"
          description="We'll email you a link to confirm"
          tone="destructive"
          disabled={!soleOwned || isBlocked || isDeleting}
          onClick={() => setConfirmOpen(true)}
        />
      </SettingsGroup>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete your account?"
        description="We'll email you a confirmation link. Once you open it, your account is deleted permanently and you're signed out everywhere. Your organizations keep their voices and generations."
        confirmLabel="Email me the link"
        onConfirm={() => deleteUser({ callbackURL: "/auth/sign-in" })}
      />
    </SettingsSection>
  );
}
