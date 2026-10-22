"use client";

import {
  useAcceptInvitation,
  useListUserInvitations,
  useRejectInvitation,
} from "@better-auth-ui/react/plugins/organization";
import { toast } from "sonner";
import { InitialsAvatar } from "@/components/initials-avatar";
import { SettingsGroup, SettingsRow, SettingsSection } from "@/components/settings/settings-group";
import { Button } from "@/components/ui/button";
import { formatRole } from "@/features/organizations/data/member-roles";
import { useRefreshOrganizationScope } from "@/features/organizations/hooks/use-refresh-organization-scope";
import { authClient } from "@/lib/auth-client";

/** Invitations sent to the signed-in user, which they can accept or decline. */
export function UserInvitations() {
  const refreshOrganizationScope = useRefreshOrganizationScope();
  const { data: invitations } = useListUserInvitations(authClient);

  const { mutate: acceptInvitation, isPending: isAccepting } = useAcceptInvitation(authClient, {
    // Accepting also makes the Organization active.
    onSuccess: () => refreshOrganizationScope("/"),
    onError: (error) => toast.error(error.error?.message ?? "Couldn't accept the invitation"),
  });
  const { mutate: rejectInvitation, isPending: isRejecting } = useRejectInvitation(authClient, {
    onError: (error) => toast.error(error.error?.message ?? "Couldn't decline the invitation"),
  });

  const pending = invitations?.filter((invitation) => invitation.status === "pending") ?? [];
  if (pending.length === 0) return null;

  return (
    <SettingsSection title="Invitations">
      <SettingsGroup>
        {pending.map((invitation) => (
          <SettingsRow
            key={invitation.id}
            media={<InitialsAvatar name={invitation.organizationName} shape="rounded" />}
            title={invitation.organizationName}
            description={`Invited as ${formatRole(invitation.role)}`}
          >
            <Button
              variant="ghost"
              size="sm"
              disabled={isAccepting || isRejecting}
              onClick={() => rejectInvitation({ invitationId: invitation.id })}
            >
              Decline
            </Button>
            <Button
              size="sm"
              disabled={isAccepting || isRejecting}
              onClick={() => acceptInvitation({ invitationId: invitation.id })}
            >
              Join
            </Button>
          </SettingsRow>
        ))}
      </SettingsGroup>
    </SettingsSection>
  );
}
