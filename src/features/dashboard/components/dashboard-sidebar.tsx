"use client";

import Image from "next/image";
import Link from "next/link";

import { UsageContainer } from "@/features/billing/components/usage-container";
import { VoiceCreateDialog } from "@/features/voices/components/voice-create-dialog";
import { useState } from "react";

import { usePathname } from "next/navigation";
import { AuthUIContext, OrganizationSwitcher, UserButton } from "@daveyplate/better-auth-ui";
import { useContext } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import {
  type LucideIcon,
  Home,
  LayoutGrid,
  AudioLines,
  Volume2,
  Settings,
  Headphones,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface MenuItem {
  title: string;
  url?: string;
  icon: LucideIcon;
  onClick?: () => void;
}

interface NavSectionProps {
  label?: string;
  items: MenuItem[];
  pathname: string;
}

function NavSection({ label, items, pathname }: NavSectionProps) {
  return (
    <SidebarGroup>
      {label && (
        <SidebarGroupLabel className="text-[13px] uppercase text-muted-foreground">
          {label}
        </SidebarGroupLabel>
      )}

      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild={!!item.url}
                isActive={
                  item.url
                    ? item.url === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.url)
                    : false
                }
                onClick={item.onClick}
                tooltip={item.title}
                className="h-9 px-3 py-2 text-[13px] tracking-tight font-medium border border-transparent data-[active=true]:border-border data-[active=true]:shadow-[0px_1px_1px_0px_rgba(44,54,53,0.03),inset_0px_0px_0px_2px_white]"
              >
                {item.url ? (
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                ) : (
                  <>
                    <item.icon />
                    <span>{item.title}</span>
                  </>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { hooks } = useContext(AuthUIContext);
  const { isPending: isSessionPending } = hooks.useSession();
  const { isPending: isOrgsPending } = hooks.useListOrganizations();

  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);

  const mainMenuItems: MenuItem[] = [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
    },
    {
      title: "Explore voices",
      url: "/voices",
      icon: LayoutGrid,
    },
    {
      title: "Text to speech",
      url: "/text-to-speech",
      icon: AudioLines,
    },
    {
      title: "Voice cloning",
      icon: Volume2,
      onClick: () => setVoiceDialogOpen(true),
    },
  ];

  const othersMenuItems: MenuItem[] = [
    {
      title: "Settings",
      icon: Settings,
      onClick: () => router.push("/account/organizations"),
    },
    {
      title: "Help and support",
      url: "mailto:business@echonic.com", // TODO: [EMAIL_ADDRESS]
      icon: Headphones,
    },
  ];
  return (
    <>
      <VoiceCreateDialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen} />
      <Sidebar collapsible="icon">
        <SidebarHeader className="flex flex-col gap-4 pt-4">
          <div className="flex items-center gap-2 pl-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0">
            <Image
              src="/echonic-logo.svg"
              alt="Echonic"
              width={24}
              height={24}
              className="rounded-sm"
            />
            <span className="group-data-[collapsible=icon]:hidden font-semibold text-lg tracking-tighter text-foreground">
              Echonic
            </span>
            <SidebarTrigger className="ml-auto lg:hidden" />
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              {isSessionPending || isOrgsPending ? (
                <Skeleton className="h-8.5 w-full group-data-[collapsible=icon]:size-8 rounded-md border bg-white" />
              ) : (
                <OrganizationSwitcher
                  hidePersonal
                  className="w-full justify-between bg-white border border-border rounded-md pl-1 pr-2 py-1 gap-3 shadow-[0px_1px_1.5px_0px_rgba(44,54,53,0.03)] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center! [&>svg.ml-auto]:group-data-[collapsible=icon]:hidden"
                  classNames={{
                    trigger: {
                      organization: {
                        base: "gap-2",
                        avatar: {
                          image: "size-6 rounded-sm",
                          fallback: "size-6 rounded-sm",
                        },
                        content: "group-data-[collapsible=icon]:hidden",
                        title: "text-[13px] tracking-tight font-medium text-foreground",
                        subtitle: "text-xs tracking-tight text-foreground",
                      },
                    },
                    content: {
                      menuItem: "cursor-pointer",
                    },
                  }}
                />
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <div className="border-b border-dashed border-border" />

        <SidebarContent>
          <NavSection items={mainMenuItems} pathname={pathname} />
          <NavSection label="Others" items={othersMenuItems} pathname={pathname} />
        </SidebarContent>

        <div className="border-b border-dashed border-border" />

        <SidebarFooter className="gap-3 py-3">
          <UsageContainer />

          <SidebarMenu>
            <SidebarMenuItem>
              {isSessionPending ? (
                <Skeleton className="h-8.5 w-full group-data-[collapsible=icon]:size-8 rounded-md border border-border bg-white" />
              ) : (
                <UserButton
                  className="w-full justify-between bg-white border border-border rounded-md pl-1 pr-2 py-1 shadow-[0px_1px_1.5px_0px_rgba(44,54,53,0.03)] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center! [&>svg.ml-auto]:group-data-[collapsible=icon]:hidden [--border:color-mix(in_srgb,transparent,var(--clerk-color-neutral,#000000)_15%)]"
                  classNames={{
                    trigger: {
                      user: {
                        base: "flex-row-reverse gap-2",
                        content: "group-data-[collapsible=icon]:hidden",
                        title: "text-[13px] tracking-tight font-medium text-foreground",
                        subtitle: "hidden",
                      },
                    },
                    content: {
                      menuItem: "cursor-pointer",
                    },
                  }}
                />
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  );
}
