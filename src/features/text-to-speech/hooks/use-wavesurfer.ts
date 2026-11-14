"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import * as Sentry from "@sentry/nextjs";
import { useIsMobile } from "@/hooks/use-mobile";
import { readThemeColor, subscribeToThemeClass } from "@/lib/theme-color";

function waveformColors() {
  const primary = readThemeColor("--primary") || "#c2410c";
  return {
    waveColor: readThemeColor("--border") || "#d4d4d8",
    progressColor: primary,
    cursorColor: primary,
  };
}

interface UseWaveSurferOptions {
  url?: string;
  autoplay?: boolean;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

interface UseWaveSurferReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  isReady: boolean;
  currentTime: number;
  duration: number;
  togglePlayPause: () => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
}

export function useWaveSurfer({
  url,
  autoplay,
  onReady,
  onError,
}: UseWaveSurferOptions): UseWaveSurferReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const isMobile = useIsMobile();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !url) return;

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    let destroyed = false;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      ...waveformColors(),
      cursorWidth: 2,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      barMinHeight: 4,
      height: "auto",
      normalize: true,
    });

    wavesurferRef.current = ws;

    ws.on("ready", () => {
      setIsReady(true);
      setDuration(ws.getDuration());

      // Catch NotAllowedError when browser blocks autoplay without user interaction
      if (autoplay) ws.play().catch(() => {});
      onReady?.();
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));
    ws.on("timeupdate", (time) => setCurrentTime(time));

    ws.on("error", (error) => {
      if (destroyed) return;
      Sentry.captureException(error);
      onError?.(new Error(String(error)));
    });

    ws.load(url).catch((error) => {
      if (destroyed) return;
      Sentry.captureException(error);
      onError?.(new Error(String(error)));
    });

    return () => {
      destroyed = true;
      ws.destroy();
    };
  }, [url, autoplay, onReady, onError, isMobile]);

  // Recolour in place when the theme changes; recreating would restart the audio.
  useEffect(
    () => subscribeToThemeClass(() => wavesurferRef.current?.setOptions(waveformColors())),
    [],
  );

  const togglePlayPause = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const seekForward = useCallback((seconds = 5) => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    ws.setTime(Math.min(ws.getCurrentTime() + seconds, ws.getDuration()));
  }, []);

  const seekBackward = useCallback((seconds = 5) => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    ws.setTime(Math.max(ws.getCurrentTime() - seconds, 0));
  }, []);

  return {
    containerRef,
    isPlaying,
    isReady,
    currentTime,
    duration,
    togglePlayPause,
    seekForward,
    seekBackward,
  };
}
