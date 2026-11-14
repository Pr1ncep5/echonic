"use client";

import { useRef } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formOptions } from "@tanstack/react-form";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppForm } from "@/hooks/use-app-form";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { TEXT_MAX_LENGTH } from "../data/constants";
import { useTRPC } from "@/trpc/client";
import { getAppErrorCode } from "@/trpc/client-error";

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
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const createMutation = useMutation(trpc.generations.create.mutationOptions({}));

  // One key per attempt to generate. It is kept when a submit fails, so retrying after a
  // dropped connection returns the Generation that was already made instead of a second,
  // billed one. It changes after a success, so generating the same text again on purpose
  // gives a new take.
  const idempotencyKey = useRef<string | null>(null);

  const { checkout } = useCheckout();

  const form = useAppForm({
    ...ttsFormOptions,
    defaultValues: defaultValues ?? defaultTTSValues,
    validators: {
      onSubmit: ttsFormSchema,
    },

    onSubmit: async ({ value }) => {
      idempotencyKey.current ??= crypto.randomUUID();
      try {
        const data = await createMutation.mutateAsync({
          idempotencyKey: idempotencyKey.current,
          text: value.text.trim(),
          voiceId: value.voiceId,
          temperature: value.temperature,
          topP: value.topP,
          topK: value.topK,
          repetitionPenalty: value.repetitionPenalty,
        });

        idempotencyKey.current = null;
        void queryClient.invalidateQueries(trpc.generations.list.pathFilter());
        router.push(`/text-to-speech/${data.id}`);
      } catch (error) {
        if (getAppErrorCode(error) === "SUBSCRIPTION_REQUIRED") {
          toast.error("Subscription required", {
            description: "Your organization needs a subscription to generate speech.",
            action: {
              label: "Subscribe",
              onClick: () => checkout(),
            },
          });
        } else {
          toast.error(error instanceof Error ? error.message : "Failed to generate audio");
        }
      }
    },
  });

  return <form.AppForm>{children}</form.AppForm>;
}
