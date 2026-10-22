import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SettingsSidebar } from "@/features/settings/components/settings-sidebar";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-svh">
      <SettingsSidebar />
      <SidebarInset className="min-h-0 min-w-0 overflow-y-auto bg-muted/40">
        <div className="sticky top-0 z-10 flex h-12 items-center border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl md:hidden">
          <SidebarTrigger />
          <span className="ml-2 text-sm font-medium">Settings</span>
        </div>
        <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-8 md:px-8 md:py-12">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
