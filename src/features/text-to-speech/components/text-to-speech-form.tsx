"use client";

import { z } from "zod";
import { formOptions } from "@tanstack/react-form";

import { useAppForm } from "@/hooks/use-app-form";
import { TEXT_MAX_LENGTH } from "../data/constants";

const ttsFormSchema = z.object({
  text: z
    .string()
    .min(1, "Please enter some text")
    .max(TEXT_MAX_LENGTH, `Text must be at most ${TEXT_MAX_LENGTH} characters`),
  voiceId: z.string().min(1, "Please select a voice"),
  temperature: z.number(),
  topP: z.number(),
  topK: z.number(),
  repetitionPenalty: z.number(),
});

export type TTSFormValues = z.infer<typeof ttsFormSchema>;

export const defaultTTSValues: TTSFormValues = {
  text: "",
  voiceId: "",
  temperature: 0.8,
  topP: 0.95,
  topK: 1000,
  repetitionPenalty: 1.2,
};

export const ttsFormOptions = formOptions({
  defaultValues: defaultTTSValues,
});

export function TextToSpeechForm({
  children,
  defaultValues,
}: {
  children: React.ReactNode;
  defaultValues?: TTSFormValues;
}) {
  const form = useAppForm({
    ...ttsFormOptions,
    defaultValues: defaultValues ?? defaultTTSValues,
    validators: {
      onSubmit: ttsFormSchema,
    },
    onSubmit: async () => {
      // TODO: Generation logic
    },
  });

  return <form.AppForm>{children}</form.AppForm>;
}
