"use client";

import { useEffect, useState } from "react";

import { formatDuration } from "@/lib/utils";

const BAR_DELAYS_MS = [0, 150, 300, 450, 600, 450, 300, 150, 0];

/** Shown in the preview area while speech is being generated. */
export function GenerationProgress() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(
      () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <output
      aria-live="polite"
      className="hidden h-full flex-1 flex-col items-center justify-center gap-5 border-t lg:flex"
    >
      <div className="flex h-12 items-center gap-1.5" aria-hidden>
        {BAR_DELAYS_MS.map((delay, index) => (
          <span
            // oxlint-disable-next-line react/no-array-index-key -- static decorative list
            key={index}
            className="h-full w-1.5 origin-center animate-pulse rounded-full bg-primary motion-reduce:animate-none"
            style={{ animationDelay: `${delay}ms`, height: `${40 + ((index * 37) % 60)}%` }}
          />
        ))}
      </div>
      <div className="space-y-1 text-center">
        <p className="text-lg font-semibold tracking-tight">Generating speech</p>
        <p className="text-sm text-muted-foreground">
          <span className="tabular-nums">{formatDuration(elapsedSeconds)}</span> elapsed. Longer
          texts take longer; you can stay on this page.
        </p>
      </div>
    </output>
  );
}
