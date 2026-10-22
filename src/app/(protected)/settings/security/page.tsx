import type { Metadata } from "next";
import { SecurityView } from "@/features/account/views/security-view";

export const metadata: Metadata = { title: "Security" };

export default function Page() {
  return <SecurityView />;
}
