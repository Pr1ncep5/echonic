"use client";

import { useSyncExternalStore } from "react";

import { WavyBackground } from "@/components/ui/wavy-background";
import { readThemeColor, subscribeToThemeClass } from "@/lib/theme-color";

const readPageBackground = () => readThemeColor("--background");

export function HeroPattern() {
  // The canvas paints its own background, and a canvas cannot read CSS variables, so the
  // page background is resolved to a colour here. Null on the server.
  const backgroundFill = useSyncExternalStore(
    subscribeToThemeClass,
    readPageBackground,
    () => null,
  );
  if (!backgroundFill) return null;

  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
      <WavyBackground
        // The component reads its props once, so it is remounted when the colour changes.
        key={backgroundFill}
        colors={["#2DD4BF", "#22D3EE", "#38BDF8", "#818CF8"]}
        backgroundFill={backgroundFill}
        blur={3}
        speed="slow"
        waveOpacity={0.1}
        waveWidth={60}
        waveYOffset={250}
        containerClassName="h-full"
        className="hidden"
      />
    </div>
  );
}
