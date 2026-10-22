import { auth } from "@/lib/auth";
import { getMemberRole } from "@/lib/org-membership";
import { OrgSelectionView } from "@/features/organizations/views/org-selection-view";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OrgSelectionPage() {
  const sessionData = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionData) {
    redirect("/auth/sign-in");
  }

  // Must match the protected layout's check, or a stale organization would bounce
  // the user between the two pages forever.
  const orgId = sessionData.session.activeOrganizationId;
  if (orgId && (await getMemberRole(sessionData.user.id, orgId))) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4 md:p-6">
      <OrgSelectionView />
    </main>
  );
}
