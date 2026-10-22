"use client";

import { useChangePassword } from "@better-auth-ui/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const close = () => {
    onOpenChange(false);
    setCurrentPassword("");
    setNewPassword("");
  };

  const { mutate: changePassword, isPending } = useChangePassword(authClient, {
    onSuccess: () => {
      toast.success("Password changed. Other devices were signed out.");
      close();
    },
    onError: (error) => toast.error(error.error?.message ?? "Couldn't change your password"),
  });

  const canSubmit = currentPassword.length > 0 && newPassword.length >= MIN_PASSWORD_LENGTH;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) {
              changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>You'll stay signed in on this device.</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="current-password">Current password</FieldLabel>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <FieldDescription>At least {MIN_PASSWORD_LENGTH} characters.</FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isPending}>
              {isPending && <Spinner />}
              Change password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
