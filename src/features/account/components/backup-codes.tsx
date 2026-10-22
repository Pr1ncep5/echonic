"use client";

import { useCopyToClipboard } from "@better-auth-ui/react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackupCodes({ codes }: { codes: readonly string[] }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg bg-muted/60 p-4 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="tabular-nums">
            {code}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => void copy(codes.join("\n"))}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy codes"}
      </Button>
    </div>
  );
}
