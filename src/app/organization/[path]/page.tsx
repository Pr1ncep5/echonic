import { OrganizationView } from "@daveyplate/better-auth-ui";
import { organizationViewPaths } from "@daveyplate/better-auth-ui/server";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(organizationViewPaths).map((path) => ({ path }));
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="container p-4 md:p-6 [&_.bg-card]:border-primary">
      <OrganizationView
        path={path}
        classNames={{
          card: {
            base: "border border-primary shadow-lg",
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
