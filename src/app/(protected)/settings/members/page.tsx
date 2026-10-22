import type { Metadata } from "next";
import { OrganizationMembersView } from "@/features/organizations/views/organization-members-view";

export const metadata: Metadata = { title: "Members" };

export default function Page() {
  return <OrganizationMembersView />;
}
