"use client";

import { useSignInMagicLink } from "@better-auth-ui/react/plugins/magic-link";
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

export function MagicLinkView() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const { mutate: signInMagicLink, isPending } = useSignInMagicLink(authClient, {
    onSuccess: (_data, variables) => setSentTo(variables.email),
    onError: (error) => toast.error(error.error?.message ?? "Couldn't send the sign-in link"),
  });

  const isValid = emailSchema.safeParse(email.trim()).success;

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        description={
          <>
            We sent a sign-in link to <span className="font-medium text-foreground">{sentTo}</span>.
          </>
        }
        footer={
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => setSentTo(null)}
          >
            Use a different email
          </button>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
          <MailCheck className="size-8 text-primary" />
          The link expires in 5 minutes and works once.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign in with email"
      description="We'll email you a link that signs you in, no password needed."
      footer={
        <Link href="/auth/sign-in" className="underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isValid) signInMagicLink({ email: email.trim(), callbackURL: "/" });
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="magic-link-email">Email</FieldLabel>
            <Input
              id="magic-link-email"
              type="email"
              autoComplete="email"
              placeholder="m@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={!isValid || isPending}>
            {isPending && <Spinner />}
            Send sign-in link
          </Button>
        </FieldGroup>
      </form>
    </AuthShell>
  );
}
