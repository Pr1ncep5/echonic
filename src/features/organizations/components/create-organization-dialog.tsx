"use client";

import { generateOrganizationSlug } from "@better-auth-ui/core/plugins/organization";
import { useCreateOrganization } from "@better-auth-ui/react/plugins/organization";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useRefreshOrganizationScope } from "@/features/organizations/hooks/use-refresh-organization-scope";
import { authClient } from "@/lib/auth-client";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
  const [name, setName] = useState("");
  const refreshOrganizationScope = useRefreshOrganizationScope();

  const { mutate: createOrganization, isPending } = useCreateOrganization(authClient, {
    onSuccess: async () => {
      onOpenChange(false);
      setName("");
      // Better Auth makes the new Organization active, so the dashboard now shows it.
      await refreshOrganizationScope("/");
    },
    onError: (error) => toast.error(error.error?.message ?? "Couldn't create the organization"),
  });

  const trimmedName = name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmedName) return;
            createOrganization({ name: trimmedName, slug: generateOrganizationSlug(trimmedName) });
          }}
        >
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              Voices, generations and billing are shared by everyone in an organization.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="organization-name">Name</FieldLabel>
            <Input
              id="organization-name"
              autoComplete="organization"
              placeholder="Acme Inc."
              maxLength={64}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmedName || isPending}>
              {isPending && <Spinner />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
