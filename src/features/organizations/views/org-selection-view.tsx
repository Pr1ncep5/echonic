"use client";

import {
  useListOrganizations,
  useSetActiveOrganization,
} from "@better-auth-ui/react/plugins/organization";
import { ChevronRight, Plus } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { InitialsAvatar } from "@/components/initials-avatar";
import {
  SettingsGroup,
  SettingsRow,
  SettingsRowButton,
  SettingsSection,
} from "@/components/settings/settings-group";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateOrganizationDialog } from "@/features/organizations/components/create-organization-dialog";
import { UserInvitations } from "@/features/organizations/components/user-invitations";
import { useRefreshOrganizationScope } from "@/features/organizations/hooks/use-refresh-organization-scope";
import { authClient } from "@/lib/auth-client";

export function OrgSelectionView() {
  const [createOpen, setCreateOpen] = useState(false);
  const refreshOrganizationScope = useRefreshOrganizationScope();

  const { data: organizations, isPending } = useListOrganizations(authClient);
  const { mutate: setActiveOrganization, isPending: isSelecting } = useSetActiveOrganization(
    authClient,
    {
      onSuccess: () => refreshOrganizationScope("/"),
      onError: (error) => toast.error(error.error?.message ?? "Couldn't open the organization"),
    },
  );

  const sortedOrganizations = useMemo(
    () => (organizations ?? []).toSorted((a, b) => a.name.localeCompare(b.name)),
    [organizations],
  );
  const hasOrganizations = sortedOrganizations.length > 0;

  return (
    <div className="w-full max-w-md space-y-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <Image src="/echonic-logo.svg" alt="" width={40} height={40} className="rounded-lg" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Choose an organization</h1>
          <p className="text-sm text-muted-foreground">
            Voices, generations and billing belong to an organization.
          </p>
        </div>
      </header>

      <UserInvitations />

      <SettingsSection title={hasOrganizations ? "Your organizations" : undefined}>
        <SettingsGroup>
          {isPending ? (
            <SettingsRow
              media={<Skeleton className="size-8 rounded-md" />}
              title={<Skeleton className="h-4 w-32" />}
            />
          ) : (
            sortedOrganizations.map((organization) => (
              <SettingsRowButton
                key={organization.id}
                disabled={isSelecting}
                onClick={() => setActiveOrganization({ organizationId: organization.id })}
                media={
                  <InitialsAvatar
                    name={organization.name}
                    image={organization.logo}
                    shape="rounded"
                  />
                }
                title={organization.name}
                description={organization.slug}
              >
                <ChevronRight className="size-4 text-muted-foreground" />
              </SettingsRowButton>
            ))
          )}

          <SettingsRowButton
            onClick={() => setCreateOpen(true)}
            media={
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Plus className="size-4" />
              </span>
            }
            title={<span className="text-primary">Create organization</span>}
            description={
              !isPending && !hasOrganizations ? "You're not in an organization yet" : undefined
            }
          />
        </SettingsGroup>
      </SettingsSection>

      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
