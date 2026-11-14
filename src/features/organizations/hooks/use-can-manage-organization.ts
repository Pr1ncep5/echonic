"use client";

import { useActiveMemberRole } from "@better-auth-ui/react/plugins/organization";
import { hasRole } from "@/features/organizations/data/member-roles";
import { authClient } from "@/lib/auth-client";

/**
 * Whether the signed-in Member is an owner or admin of the active Organization. Only
 * decides what the interface offers; the server enforces the same rule.
 */
export function useCanManageOrganization(): boolean {
  const { data: memberRole } = useActiveMemberRole(authClient);
  return hasRole(memberRole?.role, "owner", "admin");
}
