"use client";

import { Building2, ChevronLeft, type LucideIcon, Shield, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface SettingsNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const SETTINGS_NAV: { label: string; items: SettingsNavItem[] }[] = [
  {
    label: "Account",
    items: [
      { title: "Profile", url: "/settings/profile", icon: UserRound },
      { title: "Security", url: "/settings/security", icon: Shield },
    ],
  },
  {
    label: "Organization",
    items: [
      { title: "General", url: "/settings/organization", icon: Building2 },
      { title: "Members", url: "/settings/members", icon: Users },
    ],
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-muted-foreground">
              <Link href="/">
                <ChevronLeft />
                <span>Back to dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <h2 className="px-2 pt-2 text-lg font-semibold tracking-[-0.01em]">Settings</h2>
      </SidebarHeader>

      <SidebarContent>
        {SETTINGS_NAV.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      className="font-medium"
                    >
                      <Link href={item.url} onClick={() => setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
