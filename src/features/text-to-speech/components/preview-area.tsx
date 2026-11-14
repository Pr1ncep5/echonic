"use client";

import { useSelector } from "@tanstack/react-form";

import { useTypedAppFormContext } from "@/hooks/use-app-form";

import { GenerationProgress } from "./generation-progress";
import { ttsFormOptions } from "./text-to-speech-form";

/** Shows the generation progress while a submit is running, and `children` otherwise. */
export function PreviewArea({ children }: { children: React.ReactNode }) {
  const form = useTypedAppFormContext(ttsFormOptions);
  const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

  return isSubmitting ? <GenerationProgress /> : children;
}
