"use client";

import { useState } from "react";
import { Pause, Play, Download, Redo, Undo } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatDuration } from "@/lib/utils";

import { useWaveSurfer } from "../hooks/use-wavesurfer";
import { downloadGeneration } from "../lib/download-generation";

type VoicePreviewPanelVoice = {
  id?: string;
  name: string;
};

export function VoicePreviewPanel({
  audioUrl,
  voice,
  text,
}: {
  audioUrl: string;
  voice: VoicePreviewPanelVoice | null;
  text: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const selectedVoiceName = voice?.name ?? null;
  const selectedVoiceSeed = voice?.id ?? null;

  const {
    containerRef,
    isPlaying,
    isReady,
    currentTime,
    duration,
    togglePlayPause,
    seekBackward,
    seekForward,
  } = useWaveSurfer({
    url: audioUrl,
    autoplay: true,
  });

  const handleDownload = () => {
    setIsDownloading(true);

    downloadGeneration(audioUrl, text);

    setTimeout(() => setIsDownloading(false), 1000);
  };

  return (
    <div className="h-full gap-8 flex-col border-t hidden flex-1 lg:flex">
      {/* Header */}
      <div className="p-6 pb-0">
        <h3 className="font-semibold text-foreground">Result</h3>
      </div>

      {/* Content */}
      <div className="relative flex flex-1 items-center justify-center">
        {!isReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Badge
              variant="outline"
              className="gap-2 bg-background/90 px-3 py-1.5 text-sm text-muted-foreground shadow-sm"
            >
              <Spinner className="size-4" />
              <span>Loading audio...</span>
            </Badge>
          </div>
        )}
        <div
          ref={containerRef}
          className={cn(
            "w-full cursor-pointer transition-opacity duration-200",
            !isReady && "opacity-0",
          )}
        />
      </div>
      {/* Time display */}
      <div className="flex items-center justify-center">
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatDuration(currentTime)}&nbsp;
          <span className="text-muted-foreground">/&nbsp;{formatDuration(duration)}</span>
        </p>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center p-6">
        <div className="grid w-full grid-cols-3">
          {/* Metadata */}
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-sm font-medium text-foreground">{text}</p>
            {selectedVoiceName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <VoiceAvatar
                  seed={selectedVoiceSeed ?? selectedVoiceName}
                  name={selectedVoiceName}
                  className="shrink-0"
                />
                <span className="truncate">{selectedVoiceName}</span>
              </div>
            )}
          </div>

          {/* Player controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="icon-lg"
              className="flex-col"
              onClick={() => seekBackward(10)}
              disabled={!isReady}
              aria-label="Back 10 seconds"
            >
              <Undo className="size-4 -mb-1" />
              <span className="text-[10px] font-medium">10</span>
            </Button>

            <Button
              variant="default"
              size="icon-lg"
              className="rounded-full"
              onClick={togglePlayPause}
              disabled={!isReady}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="fill-background" />
              ) : (
                <Play className="fill-background" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon-lg"
              className="flex-col"
              onClick={() => seekForward(10)}
              disabled={!isReady}
              aria-label="Forward 10 seconds"
            >
              <Redo className="size-4 -mb-1" />
              <span className="text-[10px] font-medium">10</span>
            </Button>
          </div>

          {/* Download */}
          <div className="flex justify-end">
            <Button size="sm" onClick={handleDownload} disabled={isDownloading}>
              <Download className="size-4" />
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
