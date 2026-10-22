import { cn } from "@/lib/utils";
import { settingsRowClassName } from "./settings-row-class-name";

interface SettingsSectionProps {
  title?: string;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, className, children }: SettingsSectionProps) {
  return (
    <section className={cn("space-y-2", className)}>
      {title && (
        <h2 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
      )}
      {children}
      {description && <p className="px-1 text-xs text-muted-foreground">{description}</p>}
    </section>
  );
}

export function SettingsGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="settings-group"
      className={cn(
        "overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-border/70",
        className,
      )}
      {...props}
    />
  );
}

interface SettingsRowContentProps {
  media?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: "default" | "destructive";
  children?: React.ReactNode;
}

function SettingsRowContent({
  media,
  title,
  description,
  tone = "default",
  children,
}: SettingsRowContentProps) {
  return (
    <>
      {media && <div className="flex size-8 shrink-0 items-center justify-center">{media}</div>}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-sm font-medium tracking-tight",
            tone === "destructive" && "text-destructive",
          )}
        >
          {title}
        </div>
        {description && (
          <div className="truncate text-[13px] text-muted-foreground">{description}</div>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </>
  );
}

type SettingsRowProps = SettingsRowContentProps &
  Omit<React.ComponentProps<"div">, "title" | "children">;

export function SettingsRow({
  media,
  title,
  description,
  tone,
  className,
  children,
  ...props
}: SettingsRowProps) {
  return (
    <div data-slot="settings-row" className={settingsRowClassName(!!media, className)} {...props}>
      <SettingsRowContent media={media} title={title} description={description} tone={tone}>
        {children}
      </SettingsRowContent>
    </div>
  );
}

type SettingsRowButtonProps = SettingsRowContentProps &
  Omit<React.ComponentProps<"button">, "title" | "children">;

export function SettingsRowButton({
  media,
  title,
  description,
  tone,
  className,
  children,
  type = "button",
  ...props
}: SettingsRowButtonProps) {
  return (
    <button
      type={type}
      data-slot="settings-row"
      className={settingsRowClassName(
        !!media,
        cn(
          "transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 active:bg-muted disabled:pointer-events-none disabled:opacity-60",
          className,
        ),
      )}
      {...props}
    >
      <SettingsRowContent media={media} title={title} description={description} tone={tone}>
        {children}
      </SettingsRowContent>
    </button>
  );
}

interface SettingsIconTileProps {
  tone?: "default" | "primary" | "destructive";
  shape?: "rounded" | "circle";
  children: React.ReactNode;
}

/** The small tinted square that holds a row's icon. */
export function SettingsIconTile({
  tone = "default",
  shape = "rounded",
  children,
}: SettingsIconTileProps) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center [&_svg]:size-4",
        shape === "circle" ? "rounded-full" : "rounded-md",
        tone === "default" && "bg-muted text-foreground/70",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "destructive" && "bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

interface SettingsPageHeaderProps {
  title: string;
  description?: string;
}

export function SettingsPageHeader({ title, description }: SettingsPageHeaderProps) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </header>
  );
}
