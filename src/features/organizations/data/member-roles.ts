export const MEMBER_ROLES = [
  { value: "member", label: "Member", description: "Can use voices and generate speech" },
  { value: "admin", label: "Admin", description: "Can also invite and manage members" },
  {
    value: "owner",
    label: "Owner",
    description: "Full control, including deleting the organization",
  },
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number]["value"];

/** Better Auth stores multiple roles as one comma-separated string. */
export function hasRole(role: string | undefined, ...roles: MemberRole[]) {
  if (!role) return false;
  const assigned = role.split(",").map((r) => r.trim());
  return roles.some((r) => assigned.includes(r));
}

export function formatRole(role: string) {
  return role
    .split(",")
    .map((r) => MEMBER_ROLES.find((known) => known.value === r.trim())?.label ?? r.trim())
    .join(", ");
}
