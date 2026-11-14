import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function PageHeader({ title, className }: { title: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 border-b px-4 py-4", className)}>
      <SidebarTrigger />
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
    </div>
  );
}
