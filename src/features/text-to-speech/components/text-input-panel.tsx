"use client";

import { Coins } from "lucide-react";
import { useStore } from "@tanstack/react-form";

import { SettingsDrawer } from "@/features/text-to-speech/components/settings-drawer";
import { HistoryDrawer } from "@/features/text-to-speech/components/history-drawer";
import { VoiceSelectorButton } from "@/features/text-to-speech/components/voice-selector-button";

import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useTypedAppFormContext } from "@/hooks/use-app-form";

import { COST_PER_UNIT, TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import { ttsFormOptions } from "@/features/text-to-speech/components/text-to-speech-form";
import { GenerateButton } from "@/features/text-to-speech/components/generate-button";
import { PromptSuggestions } from "@/features/text-to-speech/components/prompt-suggestions";

export function TextInputPanel() {
  const form = useTypedAppFormContext(ttsFormOptions);

  const text = useStore(form.store, (s) => s.values.text);
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
  const isValid = useStore(form.store, (s) => s.isValid);

  return (
    <div className="flex h-full min-h-0 flex-col flex-1">
      {/* Text input area */}
      <div className="relative min-h-0 flex-1">
        <form.Field name="text">
          {(field) => (
            <Textarea
              aria-label="Text to speech input"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Start typing or paste your text here..."
              className="absolute inset-0 resize-none border-0 bg-transparent p-4 pb-6 lg:p-6 lg:pb-8 text-base! leading-relaxed tracking-tight shadow-none wrap-break-word focus-visible:ring-0"
              maxLength={TEXT_MAX_LENGTH}
              disabled={isSubmitting}
            />
          )}
        </form.Field>
        {/* Bottom fade overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-background to-transparent" />
      </div>
      {/* Action bar */}
      <div className="shrink-0 p-4 lg:p-6">
        {/* Mobile layout */}
        <div className="flex flex-col gap-3 lg:hidden">
          <div className="flex items-center gap-2">
            <SettingsDrawer>
              <VoiceSelectorButton />
            </SettingsDrawer>
            <HistoryDrawer />
          </div>
          <GenerateButton
            className="w-full"
            disabled={isSubmitting}
            isSubmitting={isSubmitting}
            onSubmit={() => form.handleSubmit()}
          />
        </div>
        {/* Desktop layout */}
        {text.length > 0 ? (
          <div className="hidden items-center justify-between lg:flex">
            <Badge variant="outline" className="gap-1.5 border-dashed">
              <Coins className="size-3 text-chart-5" />
              <span className="text-xs">
                <span className="tabular-nums">${(text.length * COST_PER_UNIT).toFixed(4)}</span>
                &nbsp; estimated
              </span>
            </Badge>
            <div className="flex items-center gap-3">
              <p className="text-xs tracking-tight">
                {text.length.toLocaleString()}
                <span className="text-muted-foreground">
                  &nbsp;/&nbsp;{TEXT_MAX_LENGTH.toLocaleString()} characters
                </span>
              </p>
              <GenerateButton
                size="sm"
                disabled={isSubmitting || !isValid}
                isSubmitting={isSubmitting}
                onSubmit={() => form.handleSubmit()}
              />
            </div>
          </div>
        ) : (
          <div className="hidden lg:block">
            <PromptSuggestions onSelect={(prompt) => form.setFieldValue("text", prompt)} />
          </div>
        )}
      </div>
    </div>
  );
}
