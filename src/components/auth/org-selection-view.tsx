"use client";

import { CreateOrganizationDialog, UserInvitationsCard, AuthUIContext } from "@daveyplate/better-auth-ui";
import { Building2, Plus } from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const cardClassNames = {
  base: "border border-primary shadow-lg",
  input: "border-primary",
  primaryButton:
    "bg-primary text-primary-foreground hover:bg-primary/80 hover:text-foreground",
  outlineButton:
    "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  secondaryButton:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
};

export function OrgSelectionView() {
  const { hooks, authClient, replace } = useContext(AuthUIContext);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);

  const { data: organizations, isPending } = hooks.useListOrganizations();
  const { data: activeOrganization } = hooks.useActiveOrganization();

  useEffect(() => {
    if (activeOrganization?.id) {
      replace("/");
    }
  }, [activeOrganization?.id, replace]);

  const sortedOrganizations = useMemo(() => {
    return [...(organizations ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [organizations]);

  const handleSelectOrganization = async (organizationId: string) => {
    try {
      setPendingOrgId(organizationId);
      await authClient.organization.setActive({
        organizationId,
        fetchOptions: { throw: true },
      });
      replace("/");
    } finally {
      setPendingOrgId(null);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-4">
      <UserInvitationsCard classNames={cardClassNames} />

      <Card className="border border-primary shadow-lg">
        <CardHeader>
          <CardTitle>Choose an organization</CardTitle>
          <CardDescription>Select your workspace to continue.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {isPending ? (
            <p className="text-sm text-muted-foreground">Loading organizations...</p>
          ) : sortedOrganizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You are not a member of any organization yet. Create one to continue.
            </p>
          ) : (
            sortedOrganizations.map((organization) => (
              <Button
                key={organization.id}
                variant="outline"
                className="h-14 w-full justify-start border-primary/50"
                onClick={() => void handleSelectOrganization(organization.id)}
                disabled={pendingOrgId === organization.id}
                type="button"
              >
                <Building2 className="mr-2 size-4" />
                <span className="truncate">{organization.name}</span>
              </Button>
            ))
          )}

          <Button className="mt-2 w-full" onClick={() => setCreateDialogOpen(true)} type="button">
            <Plus className="mr-2 size-4" />
            Create organization
          </Button>
        </CardContent>
      </Card>

      <CreateOrganizationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        classNames={cardClassNames}
      />
    </div>
  );
}