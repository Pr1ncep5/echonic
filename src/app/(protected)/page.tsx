import { OrganizationSwitcher, UserButton } from "@daveyplate/better-auth-ui";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <h1 className="text-2xl font-semibold">Welcome to Echonic</h1>
      <div className="flex items-center gap-4">
        <OrganizationSwitcher />
        <UserButton />
      </div>
    </div>
  );
}
