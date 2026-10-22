"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const emailSchema = z.email();

export function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const isValid = emailSchema.safeParse(email.trim()).success;

  return (
    <AuthShell
      title={sentTo ? "Check your email" : "Reset your password"}
      description={
        sentTo ? (
          <>
            If an account exists for <span className="font-medium text-foreground">{sentTo}</span>,
            we sent it a link to set a new password.
          </>
        ) : (
          "Enter your email and we'll send you a link to set a new password."
        )
      }
      footer={
        <Link href="/auth/sign-in" className="underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      {sentTo ? (
        <div className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
          <MailCheck className="size-8 text-primary" />
          The link expires in 1 hour.
        </div>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!isValid) return;
            setIsPending(true);
            const { error } = await authClient.requestPasswordReset({
              email: email.trim(),
              redirectTo: "/auth/reset-password",
            });
            setIsPending(false);
            if (error) return toast.error(error.message ?? "Couldn't send the reset link");
            setSentTo(email.trim());
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="m@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Button type="submit" className="w-full" disabled={!isValid || isPending}>
              {isPending && <Spinner />}
              Send reset link
            </Button>
          </FieldGroup>
        </form>
      )}
    </AuthShell>
  );
}
