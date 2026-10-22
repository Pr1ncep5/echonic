"use client";

import { useSession, useSignOut } from "@better-auth-ui/react";
import { ChevronsUpDown, LogOut, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InitialsAvatar } from "@/components/initials-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

export function UserMenu() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { data: session, isPending } = useSession(authClient);
  const { mutate: signOut } = useSignOut(authClient, {
    onSuccess: () => router.push("/auth/sign-in"),
  });

  const user = session?.user;
  if (isPending || !user) {
    return <Skeleton className="h-12 w-full rounded-lg group-data-[collapsible=icon]:size-8" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          tooltip={user.name}
          className="bg-background ring-1 ring-border/70 data-[state=open]:bg-muted"
        >
          <InitialsAvatar name={user.name} image={user.image} size="sm" className="size-7" />
          <span className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate text-[13px] font-medium tracking-tight">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <InitialsAvatar name={user.name} image={user.image} />
          <span className="grid min-w-0 leading-tight">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings/profile">
              <UserRound />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings/security">
              <Shield />
              Security
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => signOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
