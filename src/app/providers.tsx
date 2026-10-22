"use client";

import { organizationPlugin } from "@better-auth-ui/core/plugins/organization";
import { AuthProvider } from "@better-auth-ui/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

// The organization hooks require this plugin. Without a `slug` option they read the
// active Organization from the session's activeOrganizationId rather than the URL.
const authPlugins = [organizationPlugin()];

// Rendered inside TRPCReactProvider so auth queries share tRPC's QueryClient,
// letting an Organization switch invalidate both from one cache.
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <AuthProvider
      authClient={authClient}
      plugins={authPlugins}
      navigate={({ to, replace }) => (replace ? router.replace(to) : router.push(to))}
    >
      {children}
    </AuthProvider>
  );
}
