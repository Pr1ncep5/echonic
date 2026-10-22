"use client";

import { useVerifyBackupCode, useVerifyTotp } from "@better-auth-ui/react/plugins/two-factor";
import type { BetterFetchError } from "better-auth/client";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const CODE_LENGTH = 6;

export function TwoFactorView() {
  const router = useRouter();
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);

  // Both hooks refresh the session once the second factor creates it.
  const verifyOptions = {
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
    onError: (error: BetterFetchError) => {
      setCode("");
      toast.error(error.error?.message ?? "That code didn't work");
    },
  };
  const { mutate: verifyTotp, isPending: isVerifyingTotp } = useVerifyTotp(
    authClient,
    verifyOptions,
  );
  const { mutate: verifyBackupCode, isPending: isVerifyingBackupCode } = useVerifyBackupCode(
    authClient,
    verifyOptions,
  );
  const isPending = isVerifyingTotp || isVerifyingBackupCode;

  const verify = (value: string) => {
    if (mode === "totp") verifyTotp({ code: value, trustDevice });
    else verifyBackupCode({ code: value, trustDevice });
  };

  const canSubmit = mode === "totp" ? code.length === CODE_LENGTH : code.trim().length > 0;

  return (
    <AuthShell
      title="Two-factor authentication"
      description={
        mode === "totp"
          ? "Enter the 6-digit code from your authenticator app."
          : "Enter one of your backup codes. Each code works once."
      }
      footer={
        <Link href="/auth/sign-in" className="underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) verify(code.trim());
        }}
      >
        <FieldGroup>
          {mode === "totp" ? (
            <div className="flex justify-center">
              <InputOTP
                maxLength={CODE_LENGTH}
                pattern={REGEXP_ONLY_DIGITS}
                value={code}
                onChange={setCode}
                onComplete={(value: string) => verify(value)}
                disabled={isPending}
                aria-label="Authentication code"
              >
                <InputOTPGroup>
                  {Array.from({ length: CODE_LENGTH }, (_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          ) : (
            <Field>
              <FieldLabel htmlFor="backup-code">Backup code</FieldLabel>
              <Input
                id="backup-code"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </Field>
          )}

          <Field orientation="horizontal">
            <Checkbox
              id="trust-device"
              checked={trustDevice}
              onCheckedChange={(checked) => setTrustDevice(checked === true)}
            />
            <FieldLabel htmlFor="trust-device" className="font-normal">
              Don't ask again on this device for 30 days
            </FieldLabel>
          </Field>

          <Button type="submit" className="w-full" disabled={!canSubmit || isPending}>
            {isPending && <Spinner />}
            Verify
          </Button>

          <button
            type="button"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={() => {
              setMode(mode === "totp" ? "backup" : "totp");
              setCode("");
            }}
          >
            {mode === "totp" ? "Use a backup code instead" : "Use your authenticator app"}
          </button>
        </FieldGroup>
      </form>
    </AuthShell>
  );
}
