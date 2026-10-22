"use client";

import { useEnableTwoFactor, useVerifyTotp } from "@better-auth-ui/react/plugins/two-factor";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useState } from "react";
import { QRCode } from "react-qr-code";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { BackupCodes } from "@/features/account/components/backup-codes";
import { authClient } from "@/lib/auth-client";

const CODE_LENGTH = 6;

type SetupStep =
  | { name: "password" }
  | { name: "scan"; totpURI: string; backupCodes: string[] }
  | { name: "backup"; backupCodes: string[] };

interface TwoFactorSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TwoFactorSetupDialog({ open, onOpenChange }: TwoFactorSetupDialogProps) {
  const [step, setStep] = useState<SetupStep>({ name: "password" });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const { mutate: enableTwoFactor, isPending: isEnabling } = useEnableTwoFactor(authClient, {
    // Enabling returns { method: "otp" } only when TOTP is disabled, which Echonic never does.
    onSuccess: (data) => {
      if (data.method === "totp") {
        setStep({ name: "scan", totpURI: data.totpURI, backupCodes: data.backupCodes });
      }
    },
    onError: (error) => toast.error(error.error?.message ?? "Couldn't start two-factor setup"),
  });
  const { mutate: verifyTotp, isPending: isVerifying } = useVerifyTotp(authClient, {
    onError: (error) => {
      setCode("");
      toast.error(error.error?.message ?? "That code didn't work");
    },
  });

  const close = () => {
    onOpenChange(false);
    setStep({ name: "password" });
    setPassword("");
    setCode("");
  };

  const confirmCode = (value: string) => {
    if (step.name !== "scan") return;
    const { backupCodes } = step;
    // 2FA only turns on once a code from the app proves it was set up correctly.
    verifyTotp({ code: value }, { onSuccess: () => setStep({ name: "backup", backupCodes }) });
  };

  const secret = step.name === "scan" ? new URL(step.totpURI).searchParams.get("secret") : null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        {step.name === "password" && (
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              if (password) enableTwoFactor({ password });
            }}
          >
            <DialogHeader>
              <DialogTitle>Turn on two-factor authentication</DialogTitle>
              <DialogDescription>
                Signing in with your password will also ask for a code from an authenticator app.
                Confirm your password to continue.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="two-factor-password">Password</FieldLabel>
              <Input
                id="two-factor-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={!password || isEnabling}>
                {isEnabling && <Spinner />}
                Continue
              </Button>
            </DialogFooter>
          </form>
        )}

        {step.name === "scan" && (
          <>
            <DialogHeader>
              <DialogTitle>Scan with your authenticator app</DialogTitle>
              <DialogDescription>
                Use an app like 1Password, Google Authenticator or Authy, then enter the 6-digit
                code it shows.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3">
              {/* QR codes need a light quiet zone to scan reliably, even in dark mode. */}
              <div className="rounded-lg bg-white p-3 ring-1 ring-border/70">
                <QRCode value={step.totpURI} size={168} />
              </div>
              {secret && (
                <p className="text-center text-xs text-muted-foreground">
                  Can't scan? Enter this key:{" "}
                  <span className="font-mono break-all text-foreground select-all">{secret}</span>
                </p>
              )}
              <InputOTP
                maxLength={CODE_LENGTH}
                pattern={REGEXP_ONLY_DIGITS}
                value={code}
                onChange={setCode}
                onComplete={confirmCode}
                disabled={isVerifying}
                aria-label="Code from your authenticator app"
              >
                <InputOTPGroup>
                  {Array.from({ length: CODE_LENGTH }, (_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={code.length < CODE_LENGTH || isVerifying}
                onClick={() => confirmCode(code)}
              >
                {isVerifying && <Spinner />}
                Turn on
              </Button>
            </DialogFooter>
          </>
        )}

        {step.name === "backup" && (
          <>
            <DialogHeader>
              <DialogTitle>Save your backup codes</DialogTitle>
              <DialogDescription>
                If you lose your phone, each code lets you sign in once. Store them somewhere safe,
                like a password manager. You won't see them again.
              </DialogDescription>
            </DialogHeader>
            <BackupCodes codes={step.backupCodes} />
            <DialogFooter>
              <Button type="button" onClick={close}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
