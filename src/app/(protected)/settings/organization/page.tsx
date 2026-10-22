import type { Metadata } from "next";
import { OrganizationGeneralView } from "@/features/organizations/views/organization-general-view";

export const metadata: Metadata = { title: "Organization settings" };

export default function Page() {
  return <OrganizationGeneralView />;
}
