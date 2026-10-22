"use client";

import { useInviteMember } from "@better-auth-ui/react/plugins/organization";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { MEMBER_ROLES, type MemberRole } from "@/features/organizations/data/member-roles";
import { authClient } from "@/lib/auth-client";

const emailSchema = z.email();

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Only owners may grant the owner role. */
  canInviteOwners: boolean;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  canInviteOwners,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("member");

  const close = () => {
    onOpenChange(false);
    setEmail("");
    setRole("member");
  };

  const { mutate: inviteMember, isPending } = useInviteMember(authClient, {
    onSuccess: () => {
      toast.success(`Invited ${email}`);
      close();
    },
    onError: (error) => toast.error(error.error?.message ?? "Couldn't send the invitation"),
  });

  const roles = MEMBER_ROLES.filter((option) => canInviteOwners || option.value !== "owner");
  const isValid = emailSchema.safeParse(email.trim()).success;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid) inviteMember({ email: email.trim(), role });
          }}
        >
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              They'll see the invitation the next time they sign in with this email.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input
                id="invite-email"
                type="email"
                autoComplete="off"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <Select
                value={role}
                onValueChange={(value) => {
                  const match = roles.find((option) => option.value === value);
                  if (match) setRole(match.value);
                }}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {MEMBER_ROLES.find((option) => option.value === role)?.description}
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending && <Spinner />}
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
