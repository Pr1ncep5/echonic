"use client";

import { organizationPlugin } from "@better-auth-ui/core/plugins/organization";
import { AuthProvider } from "@better-auth-ui/react";
import { ThemeProvider } from "next-themes";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

// The organization hooks require this plugin. Without a `slug` option they read the
// active Organization from the session's activeOrganizationId rather than the URL.
const authPlugins = [organizationPlugin()];

// next-themes renders an inline script that sets the theme before first paint. It must be
// executable in the server HTML, but React warns about any executable script rendered on
// the client, where it never runs anyway. Marking it as a data block there silences the
// warning without changing behaviour.
const themeScriptProps =
  typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

// Rendered inside TRPCReactProvider so auth queries share tRPC's QueryClient,
// letting an Organization switch invalidate both from one cache.
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={themeScriptProps}
    >
      <AuthProvider
        authClient={authClient}
        plugins={authPlugins}
        navigate={({ to, replace }) => (replace ? router.replace(to) : router.push(to))}
      >
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
