"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Only one preview plays at a time across the app: starting one pauses the previous.
let currentlyPlaying: HTMLAudioElement | null = null;

export function useAudioPlayback(src: string | File | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        if (currentlyPlaying === audio) {
          currentlyPlaying = null;
        }
        audioRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setIsPlaying(false);
      setIsLoading(false);
    };
  }, [src]);

  const togglePlay = useCallback(() => {
    if (!src) return;

    if (!audioRef.current) {
      if (src instanceof File) {
        objectUrlRef.current = URL.createObjectURL(src);
      }
      const audio = new Audio(objectUrlRef.current ?? (typeof src === "string" ? src : undefined));
      // Driven by the element's own events, so being paused by another preview is reflected.
      audio.addEventListener("playing", () => {
        setIsPlaying(true);
        setIsLoading(false);
      });
      audio.addEventListener("pause", () => setIsPlaying(false));
      audio.addEventListener("ended", () => setIsPlaying(false));
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    if (!audio.paused) {
      audio.pause();
      return;
    }

    if (currentlyPlaying && currentlyPlaying !== audio) {
      currentlyPlaying.pause();
    }
    currentlyPlaying = audio;
    setIsLoading(true);
    // Rejected when the file cannot be loaded or the browser blocks playback.
    audio.play().catch(() => {
      setIsLoading(false);
      setIsPlaying(false);
    });
  }, [src]);

  return { isPlaying, isLoading, togglePlay };
}
