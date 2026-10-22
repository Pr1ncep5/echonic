"use client";

import { useListAccounts, useSession } from "@better-auth-ui/react";
import {
  useDisableTwoFactor,
  useGenerateBackupCodes,
} from "@better-auth-ui/react/plugins/two-factor";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  SettingsGroup,
  SettingsIconTile,
  SettingsRow,
  SettingsRowButton,
  SettingsSection,
} from "@/components/settings/settings-group";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BackupCodes } from "@/features/account/components/backup-codes";
import { PasswordPromptDialog } from "@/features/account/components/password-prompt-dialog";
import { TwoFactorSetupDialog } from "@/features/account/components/two-factor-setup-dialog";
import { authClient } from "@/lib/auth-client";

type OpenDialog = "setup" | "disable" | "regenerate" | null;

export function TwoFactorSection() {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  const { data: session } = useSession(authClient);
  const { data: accounts } = useListAccounts(authClient);
  const isEnabled = session?.user.twoFactorEnabled === true;
  const hasPassword = accounts?.some((account) => account.providerId === "credential");

  const { mutate: disableTwoFactor, isPending: isDisabling } = useDisableTwoFactor(authClient, {
    onSuccess: () => {
      setOpenDialog(null);
      toast.success("Two-factor authentication turned off");
    },
    onError: (error) => toast.error(error.error?.message ?? "Couldn't turn off two-factor"),
  });
  const { mutate: generateBackupCodes, isPending: isGenerating } = useGenerateBackupCodes(
    authClient,
    {
      onSuccess: (data) => {
        setOpenDialog(null);
        setNewBackupCodes(data.backupCodes);
      },
      onError: (error) => toast.error(error.error?.message ?? "Couldn't create new codes"),
    },
  );

  return (
    <SettingsSection
      title="Two-factor authentication"
      description={
        hasPassword
          ? "Password sign-ins also ask for a code from your authenticator app. Passkeys, magic links and Google or GitHub skip this step."
          : "Two-factor protects password sign-in. Set a password above to turn it on."
      }
    >
      <SettingsGroup>
        <SettingsRow
          media={
            <SettingsIconTile tone={isEnabled ? "primary" : "default"}>
              {isEnabled ? <ShieldCheck /> : <ShieldOff />}
            </SettingsIconTile>
          }
          title="Authenticator app"
          description={isEnabled ? "On" : "Off"}
        >
          {isEnabled ? (
            <Button variant="ghost" size="sm" onClick={() => setOpenDialog("disable")}>
              Turn off
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPassword}
              onClick={() => setOpenDialog("setup")}
            >
              Turn on
            </Button>
          )}
        </SettingsRow>
        {isEnabled && (
          <SettingsRowButton
            title={<span className="text-primary">Create new backup codes</span>}
            description="Your current codes stop working"
            onClick={() => setOpenDialog("regenerate")}
          />
        )}
      </SettingsGroup>

      <TwoFactorSetupDialog
        open={openDialog === "setup"}
        onOpenChange={(open) => setOpenDialog(open ? "setup" : null)}
      />
      <PasswordPromptDialog
        open={openDialog === "disable"}
        onOpenChange={(open) => setOpenDialog(open ? "disable" : null)}
        title="Turn off two-factor authentication?"
        description="Password sign-ins will no longer ask for a code."
        confirmLabel="Turn off"
        destructive
        isPending={isDisabling}
        onConfirm={(password) => disableTwoFactor({ password })}
      />
      <PasswordPromptDialog
        open={openDialog === "regenerate"}
        onOpenChange={(open) => setOpenDialog(open ? "regenerate" : null)}
        title="Create new backup codes?"
        description="Your current backup codes will stop working."
        confirmLabel="Create codes"
        isPending={isGenerating}
        onConfirm={(password) => generateBackupCodes({ password })}
      />

      <Dialog
        open={newBackupCodes !== null}
        onOpenChange={(open) => !open && setNewBackupCodes(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your new backup codes</DialogTitle>
            <DialogDescription>
              Store them somewhere safe. You won't see them again.
            </DialogDescription>
          </DialogHeader>
          {newBackupCodes && <BackupCodes codes={newBackupCodes} />}
          <DialogFooter>
            <Button type="button" onClick={() => setNewBackupCodes(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
