import { auth } from "@/lib/auth";
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
  if (sessionData && !sessionData.session.activeOrganizationId) {
    redirect("/org-selection");
  }

  return <>{children}</>;
}
