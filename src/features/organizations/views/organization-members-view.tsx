"use client";

import { useSession } from "@better-auth-ui/react";
import {
  useActiveMemberRole,
  useCancelInvitation,
  useListOrganizationInvitations,
  useListOrganizationMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "@better-auth-ui/react/plugins/organization";
import { formatDistanceToNow } from "date-fns";
import { Mail, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { InitialsAvatar } from "@/components/initials-avatar";
import {
  SettingsGroup,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-group";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteMemberDialog } from "@/features/organizations/components/invite-member-dialog";
import { formatRole, hasRole, MEMBER_ROLES } from "@/features/organizations/data/member-roles";
import { authClient } from "@/lib/auth-client";

interface PendingRemoval {
  memberId: string;
  name: string;
}

export function OrganizationMembersView() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  const { data: session } = useSession(authClient);
  const { data: memberRole } = useActiveMemberRole(authClient);
  const canManage = hasRole(memberRole?.role, "owner", "admin");
  const isOwner = hasRole(memberRole?.role, "owner");

  const { data: membersData, isPending: isMembersPending } = useListOrganizationMembers(authClient);
  const { data: invitations } = useListOrganizationInvitations(authClient, { enabled: canManage });

  const { mutate: updateMemberRole } = useUpdateMemberRole(authClient, {
    onSuccess: () => toast.success("Role updated"),
    onError: (error) => toast.error(error.error?.message ?? "Couldn't change the role"),
  });
  const { mutate: removeMember } = useRemoveMember(authClient, {
    onError: (error) => toast.error(error.error?.message ?? "Couldn't remove the member"),
  });
  const { mutate: cancelInvitation } = useCancelInvitation(authClient, {
    onError: (error) => toast.error(error.error?.message ?? "Couldn't cancel the invitation"),
  });

  const members = (membersData?.members ?? []).toSorted((a, b) =>
    a.user.name.localeCompare(b.user.name),
  );
  const pendingInvitations = invitations?.filter((invitation) => invitation.status === "pending");
  const roleOptions = MEMBER_ROLES.filter((option) => isOwner || option.value !== "owner");

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <SettingsPageHeader title="Members" description="People who share this organization." />
        {canManage && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus />
            Invite
          </Button>
        )}
      </div>

      <SettingsSection
        title={
          membersData
            ? `${membersData.total} ${membersData.total === 1 ? "member" : "members"}`
            : "Members"
        }
        description={canManage ? undefined : "Only owners and admins can invite or remove members."}
      >
        <SettingsGroup>
          {isMembersPending ? (
            <SettingsRow
              media={<Skeleton className="size-8 rounded-full" />}
              title={<Skeleton className="h-4 w-36" />}
            />
          ) : (
            members.map((member) => {
              const isSelf = member.userId === session?.user.id;
              // Admins can't demote or remove owners; only owners can.
              const isEditable =
                canManage && !isSelf && (isOwner || !hasRole(member.role, "owner"));
              return (
                <SettingsRow
                  key={member.id}
                  media={<InitialsAvatar name={member.user.name} image={member.user.image} />}
                  title={
                    <>
                      {member.user.name}
                      {isSelf && <span className="font-normal text-muted-foreground"> (you)</span>}
                    </>
                  }
                  description={member.user.email}
                >
                  {isEditable ? (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(role) => {
                          const match = roleOptions.find((option) => option.value === role);
                          if (match) updateMemberRole({ memberId: member.id, role: match.value });
                        }}
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label={`Role for ${member.user.name}`}
                          className="border-transparent bg-transparent shadow-none hover:bg-muted"
                        >
                          <SelectValue>{formatRole(member.role)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent align="end">
                          {roleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${member.user.name}`}
                        onClick={() =>
                          setPendingRemoval({ memberId: member.id, name: member.user.name })
                        }
                      >
                        <X />
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">{formatRole(member.role)}</span>
                  )}
                </SettingsRow>
              );
            })
          )}
        </SettingsGroup>
      </SettingsSection>

      {canManage && pendingInvitations && pendingInvitations.length > 0 && (
        <SettingsSection title="Pending invitations">
          <SettingsGroup>
            {pendingInvitations.map((invitation) => (
              <SettingsRow
                key={invitation.id}
                media={
                  <span className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground/70">
                    <Mail className="size-4" />
                  </span>
                }
                title={invitation.email}
                description={`${formatRole(invitation.role)} · expires ${formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelInvitation({ invitationId: invitation.id })}
                >
                  Cancel
                </Button>
              </SettingsRow>
            ))}
          </SettingsGroup>
        </SettingsSection>
      )}

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        canInviteOwners={isOwner}
      />
      <ConfirmActionDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title={`Remove ${pendingRemoval?.name ?? "member"}?`}
        description="They'll lose access right away. Custom voices they cloned stay with the organization."
        confirmLabel="Remove"
        onConfirm={() =>
          pendingRemoval && removeMember({ memberIdOrEmail: pendingRemoval.memberId })
        }
      />
    </>
  );
}
