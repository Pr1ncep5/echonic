"use client";

import { useSession } from "@better-auth-ui/react";
import {
  useActiveMemberRole,
  useActiveOrganization,
  useDeleteOrganization,
  useLeaveOrganization,
  useListOrganizationMembers,
  useUpdateOrganization,
} from "@better-auth-ui/react/plugins/organization";
import { format } from "date-fns";
import { LogOut, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { InitialsAvatar } from "@/components/initials-avatar";
import { InlineTextSetting } from "@/components/settings/inline-text-setting";
import {
  SettingsGroup,
  SettingsIconTile,
  SettingsPageHeader,
  SettingsRow,
  SettingsRowButton,
  SettingsSection,
} from "@/components/settings/settings-group";
import { Skeleton } from "@/components/ui/skeleton";
import { UserInvitations } from "@/features/organizations/components/user-invitations";
import { formatRole, hasRole } from "@/features/organizations/data/member-roles";
import { useRefreshOrganizationScope } from "@/features/organizations/hooks/use-refresh-organization-scope";
import { authClient } from "@/lib/auth-client";

export function OrganizationGeneralView() {
  const [confirming, setConfirming] = useState<"leave" | "delete" | null>(null);
  const refreshOrganizationScope = useRefreshOrganizationScope();

  const { data: organization, isPending } = useActiveOrganization(authClient);
  const { data: memberRole } = useActiveMemberRole(authClient);
  const { data: session } = useSession(authClient);
  const { data: membersData } = useListOrganizationMembers(authClient);
  const membership = membersData?.members.find((item) => item.userId === session?.user.id);
  const role = memberRole?.role;
  const canManage = hasRole(role, "owner", "admin");
  const isOwner = hasRole(role, "owner");

  const { mutate: updateOrganization, isPending: isSaving } = useUpdateOrganization(authClient, {
    onSuccess: () => toast.success("Organization renamed"),
    onError: (error) => toast.error(error.error?.message ?? "Couldn't rename the organization"),
  });
  const { mutate: leaveOrganization } = useLeaveOrganization(authClient, {
    onSuccess: () => refreshOrganizationScope("/org-selection"),
    onError: (error) => toast.error(error.error?.message ?? "Couldn't leave the organization"),
  });
  const { mutate: deleteOrganization } = useDeleteOrganization(authClient, {
    onSuccess: () => refreshOrganizationScope("/org-selection"),
    onError: (error) => toast.error(error.error?.message ?? "Couldn't delete the organization"),
  });

  return (
    <>
      <SettingsPageHeader title="Organization" description="Shared by everyone in your team." />

      <UserInvitations />

      <SettingsGroup>
        {isPending || !organization ? (
          <SettingsRow
            className="min-h-20"
            media={<Skeleton className="size-10 rounded-md" />}
            title={<Skeleton className="h-4 w-32" />}
          />
        ) : (
          <SettingsRow
            className="min-h-20"
            media={
              <InitialsAvatar
                name={organization.name}
                image={organization.logo}
                shape="rounded"
                size="lg"
              />
            }
            title={<span className="text-base">{organization.name}</span>}
            description={[
              role && formatRole(role),
              membership &&
                `Member since ${format(new Date(membership.createdAt), "MMMM d, yyyy")}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
      </SettingsGroup>

      <SettingsSection
        title="Details"
        description={canManage ? undefined : "Only owners and admins can rename the organization."}
      >
        <SettingsGroup>
          <InlineTextSetting
            id="organization-name"
            label="Name"
            value={organization?.name ?? ""}
            disabled={!organization || !canManage}
            isSaving={isSaving}
            maxLength={64}
            autoComplete="organization"
            onSave={(name) => updateOrganization({ data: { name } })}
          />
          <SettingsRow title="Slug">
            <span className="font-mono text-[13px] text-muted-foreground">
              {organization?.slug}
            </span>
          </SettingsRow>
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection
        title="Danger zone"
        description="Custom voices and generations stay with the organization when you leave."
      >
        <SettingsGroup>
          <SettingsRowButton
            media={
              <SettingsIconTile tone="destructive">
                <LogOut />
              </SettingsIconTile>
            }
            title="Leave organization"
            tone="destructive"
            disabled={!organization}
            onClick={() => setConfirming("leave")}
          />
          {isOwner && (
            <SettingsRowButton
              media={
                <SettingsIconTile tone="destructive">
                  <Trash2 />
                </SettingsIconTile>
              }
              title="Delete organization"
              description="Permanently deletes its voices, generations and members"
              tone="destructive"
              disabled={!organization}
              onClick={() => setConfirming("delete")}
            />
          )}
        </SettingsGroup>
      </SettingsSection>

      <ConfirmActionDialog
        open={confirming === "leave"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={`Leave ${organization?.name ?? "organization"}?`}
        description="You'll lose access to its voices and generations until someone invites you again."
        confirmLabel="Leave"
        onConfirm={() => organization && leaveOrganization({ organizationId: organization.id })}
      />
      <ConfirmActionDialog
        open={confirming === "delete"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={`Delete ${organization?.name ?? "organization"}?`}
        description="This permanently deletes the organization, its custom voices and its generation history. This can't be undone."
        confirmLabel="Delete organization"
        onConfirm={() => organization && deleteOrganization({ organizationId: organization.id })}
      />
    </>
  );
}
