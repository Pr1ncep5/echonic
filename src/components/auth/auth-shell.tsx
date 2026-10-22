import Image from "next/image";
import Link from "next/link";

interface AuthShellProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** The centred card shared by the smaller auth steps (magic link, reset, 2FA). */
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Link href="/auth/sign-in" aria-label="Echonic">
            <Image src="/echonic-logo.svg" alt="" width={40} height={40} className="rounded-lg" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="rounded-xl bg-card p-6 ring-1 ring-border/70">{children}</div>
        {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  );
}
