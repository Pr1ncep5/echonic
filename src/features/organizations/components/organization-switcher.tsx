"use client";

import {
  useActiveOrganization,
  useListOrganizations,
  useSetActiveOrganization,
} from "@better-auth-ui/react/plugins/organization";
import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { InitialsAvatar } from "@/components/initials-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateOrganizationDialog } from "@/features/organizations/components/create-organization-dialog";
import { useRefreshOrganizationScope } from "@/features/organizations/hooks/use-refresh-organization-scope";
import { authClient } from "@/lib/auth-client";

export function OrganizationSwitcher() {
  const { isMobile } = useSidebar();
  const [createOpen, setCreateOpen] = useState(false);
  const refreshOrganizationScope = useRefreshOrganizationScope();

  const { data: activeOrganization, isPending: isActivePending } =
    useActiveOrganization(authClient);
  const { data: organizations, isPending: isListPending } = useListOrganizations(authClient);
  const { mutate: setActiveOrganization } = useSetActiveOrganization(authClient, {
    onSuccess: () => refreshOrganizationScope(),
    onError: (error) => toast.error(error.error?.message ?? "Couldn't switch organization"),
  });

  const sortedOrganizations = useMemo(
    () => (organizations ?? []).toSorted((a, b) => a.name.localeCompare(b.name)),
    [organizations],
  );

  if (isActivePending || isListPending || !activeOrganization) {
    return <Skeleton className="h-12 w-full rounded-lg group-data-[collapsible=icon]:size-8" />;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            tooltip={activeOrganization.name}
            className="bg-background ring-1 ring-border/70 data-[state=open]:bg-muted"
          >
            <InitialsAvatar
              name={activeOrganization.name}
              image={activeOrganization.logo}
              shape="rounded"
              size="sm"
              className="size-7"
            />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-tight">
              {activeOrganization.name}
            </span>
            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-(--radix-dropdown-menu-trigger-width) min-w-60"
          side={isMobile ? "bottom" : "right"}
          align="start"
          sideOffset={4}
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Organizations
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            {sortedOrganizations.map((organization) => {
              const isActive = organization.id === activeOrganization.id;
              return (
                <DropdownMenuItem
                  key={organization.id}
                  className="gap-2"
                  onSelect={() => {
                    if (!isActive) setActiveOrganization({ organizationId: organization.id });
                  }}
                >
                  <InitialsAvatar
                    name={organization.name}
                    image={organization.logo}
                    shape="rounded"
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 truncate">{organization.name}</span>
                  {isActive && <Check className="size-4 text-primary" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings/organization">
              <Settings />
              Organization settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
