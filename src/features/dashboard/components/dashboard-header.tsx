"use client";

import { Headphones, ThumbsUp } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuthUIContext } from "@daveyplate/better-auth-ui";
import { useContext } from "react";

export function DashboardHeader() {
  const { hooks } = useContext(AuthUIContext);
  const { data: session, isPending } = hooks.useSession();
  const user = session?.user;

  return (
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Nice to see you</p>
        <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
          {!isPending ? user?.name || "there" : "..."}
        </h1>
      </div>

      <div className="lg:flex hidden items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="mailto:business@echonic.com"> {/* TODO: [EMAIL_ADDRESS] */}
            <ThumbsUp className="mr-2 size-4" />
            <span className="hidden lg:block">Feedback</span>
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="mailto:business@echonic.com"> {/* TODO: [EMAIL_ADDRESS] */}
            <Headphones className="mr-2 size-4" />
            <span className="hidden lg:block">Need help?</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
