"use client";

import { useSession } from "@better-auth-ui/react";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

export function DashboardHeader() {
  const { data: session, isPending } = useSession(authClient);
  const firstName = session?.user.name.trim().split(/\s+/)[0];

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">Nice to see you</p>
      {isPending ? (
        <Skeleton className="h-8 w-40 lg:h-9" />
      ) : (
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
          {firstName || "Welcome back"}
        </h1>
      )}
    </div>
  );
}
