import { auth } from "@/lib/auth";
import { OrgSelectionView } from "@/components/auth/org-selection-view";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OrgSelectionPage() {
  const sessionData = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionData) {
    redirect("/auth/sign-in");
  }

  if (sessionData.session.activeOrganizationId) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 md:p-6">
      <OrgSelectionView />
    </main>
  );
}