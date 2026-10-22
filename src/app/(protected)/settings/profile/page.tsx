import type { Metadata } from "next";
import { ProfileView } from "@/features/account/views/profile-view";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <ProfileView />;
}
