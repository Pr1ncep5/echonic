import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ForgotPasswordView } from "@/components/auth/forgot-password-view";
import { MagicLinkView } from "@/components/auth/magic-link-view";
import { ResetPasswordView } from "@/components/auth/reset-password-view";
import { SignInView } from "@/components/auth/sign-in-view";
import { SignOutView } from "@/components/auth/sign-out-view";
import { SignUpView } from "@/components/auth/sign-up-view";
import { TwoFactorView } from "@/components/auth/two-factor-view";

const AUTH_VIEWS = {
  "sign-in": SignInView,
  "sign-up": SignUpView,
  "sign-out": SignOutView,
  "magic-link": MagicLinkView,
  "forgot-password": ForgotPasswordView,
  "reset-password": ResetPasswordView,
  "two-factor": TwoFactorView,
} as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(AUTH_VIEWS).map((path) => ({ path }));
}

export default async function AuthPage({ params }: PageProps<"/auth/[path]">) {
  const { path } = await params;

  const View = Object.entries(AUTH_VIEWS).find(([key]) => key === path)?.[1];
  if (!View) notFound();

  // ResetPasswordView reads the token from the query string, which needs a Suspense boundary.
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
