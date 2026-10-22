"use client";

import { useChangeEmail } from "@better-auth-ui/react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const emailSchema = z.email();

interface ChangeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
}

export function ChangeEmailDialog({ open, onOpenChange, currentEmail }: ChangeEmailDialogProps) {
  const [newEmail, setNewEmail] = useState("");

  const close = () => {
    onOpenChange(false);
    setNewEmail("");
  };

  const { mutate: changeEmail, isPending } = useChangeEmail(authClient, {
    onSuccess: () => {
      toast.success(`Check ${newEmail.trim()} for a link to confirm the change`);
      close();
    },
    onError: (error) => toast.error(error.error?.message ?? "Couldn't change your email"),
  });

  const trimmed = newEmail.trim();
  const isValid = emailSchema.safeParse(trimmed).success && trimmed !== currentEmail;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid) changeEmail({ newEmail: trimmed, callbackURL: "/settings/profile" });
          }}
        >
          <DialogHeader>
            <DialogTitle>Change email</DialogTitle>
            <DialogDescription>
              We'll send a confirmation link to the new address. Your email changes once you open
              it.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="new-email">New email</FieldLabel>
            <Input
              id="new-email"
              type="email"
              autoComplete="email"
              placeholder={currentEmail}
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending && <Spinner />}
              Send link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
