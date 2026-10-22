"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Better Auth redirects here with ?token=… or, for an expired or used link, ?error=INVALID_TOKEN.
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);

  if (!token) {
    return (
      <AuthShell
        title="This link has expired"
        description="Reset links work once and expire after 1 hour."
        footer={
          <Link href="/auth/sign-in" className="underline underline-offset-4">
            Back to sign in
          </Link>
        }
      >
        <Button asChild className="w-full">
          <Link href="/auth/forgot-password">Send a new link</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" description="You'll be signed out on all other devices.">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (password.length < MIN_PASSWORD_LENGTH) return;
          setIsPending(true);
          const { error } = await authClient.resetPassword({ newPassword: password, token });
          setIsPending(false);
          if (error) return toast.error(error.message ?? "Couldn't set your password");
          toast.success("Password set. Sign in with your new password.");
          router.push("/auth/sign-in");
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="reset-password">New password</FieldLabel>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <FieldDescription>At least {MIN_PASSWORD_LENGTH} characters.</FieldDescription>
          </Field>
          <Button
            type="submit"
            className="w-full"
            disabled={password.length < MIN_PASSWORD_LENGTH || isPending}
          >
            {isPending && <Spinner />}
            Set password
          </Button>
        </FieldGroup>
      </form>
    </AuthShell>
  );
}
