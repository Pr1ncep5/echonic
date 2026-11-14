"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { formatEstimate } from "@/features/billing/lib/format-price";
import { TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";

export function TextInputPanel() {
  const [text, setText] = useState("");
  const router = useRouter();

  const handleGenerate = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    router.push(`/text-to-speech?text=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="rounded-2xl border bg-card shadow-sm transition-shadow focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
      <div className="p-4 pb-2">
        <Textarea
          aria-label="Text to turn into speech"
          placeholder="Start typing or paste your text here..."
          className="min-h-35 resize-none border-0 bg-transparent p-0 text-base! leading-relaxed shadow-none focus-visible:ring-0 dark:bg-transparent"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={TEXT_MAX_LENGTH}
        />
      </div>

      <div className="flex flex-col gap-3 border-t p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3 lg:justify-start">
          <Badge variant="outline" className="gap-1.5 border-dashed">
            <Coins className="size-3 text-muted-foreground" />
            <span className="text-xs">
              {text.length === 0 ? (
                "Start typing to estimate"
              ) : (
                <>
                  <span className="tabular-nums">{formatEstimate(text.length)}</span> estimated
                </>
              )}
            </span>
          </Badge>
          <span className="text-xs text-muted-foreground tabular-nums">
            {text.length.toLocaleString("en-US")} / {TEXT_MAX_LENGTH.toLocaleString("en-US")}
          </span>
        </div>

        <Button
          size="sm"
          disabled={!text.trim()}
          onClick={handleGenerate}
          className="w-full lg:w-auto"
        >
          Generate speech
        </Button>
      </div>
    </div>
  );
}
