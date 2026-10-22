"use client";

import { useSignOut } from "@better-auth-ui/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export function SignOutView() {
  const router = useRouter();
  const { mutate: signOut } = useSignOut(authClient, {
    onSettled: () => router.replace("/auth/sign-in"),
  });

  useEffect(() => {
    signOut();
  }, [signOut]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="size-5 text-muted-foreground" />
    </div>
  );
}
