import { auth } from "@/lib/auth";
import { getMemberRole } from "@/lib/org-membership";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const sessionData = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionData) {
    redirect("/auth/sign-in");
  }

  // 2. Organization Check
  // Since this layout only wraps the (protected) folder, we can safely
  // redirect them to /org-selection without causing an infinite loop.
  // The membership check catches sessions still pointing at an organization
  // the user was removed from.
  const orgId = sessionData.session.activeOrganizationId;
  if (!orgId || !(await getMemberRole(sessionData.user.id, orgId))) {
    redirect("/org-selection");
  }

  return <>{children}</>;
}
