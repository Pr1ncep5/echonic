import { cn } from "@/lib/utils";

/** Shared by every settings row, including ones that render as a form or button. */
export function settingsRowClassName(hasMedia: boolean, className?: string) {
  return cn(
    // Hairline dividers start past the media, like grouped lists in iOS Settings.
    "relative flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left",
    "before:absolute before:top-0 before:right-0 before:left-(--row-inset) before:h-px before:bg-border/70 first:before:hidden",
    hasMedia ? "[--row-inset:3.75rem]" : "[--row-inset:1rem]",
    className,
  );
}
