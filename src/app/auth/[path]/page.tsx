import { AuthView } from "@daveyplate/better-auth-ui";
import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import { SignInView } from "@/components/auth/sign-in-view";
import { SignUpView } from "@/components/auth/sign-up-view";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  if (path === authViewPaths.SIGN_IN) {
    return <SignInView />;
  }

  if (path === authViewPaths.SIGN_UP) {
    return <SignUpView />;
  }

  return (
    <main className="container flex min-h-screen grow flex-col items-center justify-center self-center p-4 md:p-6 [&_.bg-card]:border-primary">
      <AuthView
        path={path}
        classNames={{
          base: "border border-primary shadow-lg",
          form: {
            input: "border-primary",
            primaryButton:
              "bg-primary text-primary-foreground hover:bg-primary/80 hover:text-foreground",
            outlineButton:
              "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
            secondaryButton:
              "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
          },
        }}
      />
    </main>
  );
}
