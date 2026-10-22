"use client";

import {
  useAddPasskey,
  useDeletePasskey,
  useListPasskeys,
} from "@better-auth-ui/react/plugins/passkey";
import { format } from "date-fns";
import { Fingerprint, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import {
  SettingsGroup,
  SettingsIconTile,
  SettingsRow,
  SettingsRowButton,
  SettingsSection,
} from "@/components/settings/settings-group";
import { Button } from "@/components/ui/button";
import { describeUserAgent } from "@/features/account/lib/describe-user-agent";
import { authClient } from "@/lib/auth-client";

export function PasskeysSection() {
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: passkeys } = useListPasskeys(authClient);
  const { mutate: addPasskey, isPending: isAdding } = useAddPasskey(authClient, {
    onSuccess: () => toast.success("Passkey added"),
    onError: (error) => toast.error(error.error?.message ?? "Couldn't add the passkey"),
  });
  const { mutate: deletePasskey } = useDeletePasskey(authClient, {
    onError: (error) => toast.error(error.error?.message ?? "Couldn't remove the passkey"),
  });

  return (
    <SettingsSection
      title="Passkeys"
      description="Sign in with Face ID, Touch ID, Windows Hello or a security key instead of a password."
    >
      <SettingsGroup>
        {passkeys?.map((passkey) => {
          const name = passkey.name || "Passkey";
          return (
            <SettingsRow
              key={passkey.id}
              media={
                <SettingsIconTile>
                  <Fingerprint />
                </SettingsIconTile>
              }
              title={name}
              description={
                passkey.createdAt
                  ? `Added ${format(new Date(passkey.createdAt), "MMM d, yyyy")}`
                  : undefined
              }
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${name}`}
                onClick={() => setPendingDelete({ id: passkey.id, name })}
              >
                <X />
              </Button>
            </SettingsRow>
          );
        })}
        <SettingsRowButton
          media={
            <SettingsIconTile tone="primary">
              <Plus />
            </SettingsIconTile>
          }
          title={<span className="text-primary">Add a passkey</span>}
          disabled={isAdding}
          // Name it after this device so the list stays recognisable.
          onClick={() => addPasskey({ name: describeUserAgent(navigator.userAgent).label })}
        />
      </SettingsGroup>

      <ConfirmActionDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Remove ${pendingDelete?.name ?? "passkey"}?`}
        description="You won't be able to sign in with it anymore. Your other sign-in methods keep working."
        confirmLabel="Remove"
        onConfirm={() => pendingDelete && deletePasskey({ id: pendingDelete.id })}
      />
    </SettingsSection>
  );
}
