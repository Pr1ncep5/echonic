"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      magicLink
      organization={{
        pathMode: "default",
        basePath: "/organization",
        // TODO: Add later logo upload for org 
        // logo: {
        //   upload: async (file) => {
        //     return uploadedUrl;
        //   },
        //   size: 256,
        //   extension: "png",
        // },
      }}
      onSessionChange={() => {
        // Clear router cache (protected routes)
        router.refresh();
      }}
      Link={Link}
    >
      {children}
    </AuthUIProvider>
  );
}
