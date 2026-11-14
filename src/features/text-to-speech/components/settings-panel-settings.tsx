"use client";

import { RotateCcw } from "lucide-react";
import { useSelector } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { useTypedAppFormContext } from "@/hooks/use-app-form";

import { sliders } from "@/features/text-to-speech/data/sliders";
import {
  defaultTTSValues,
  ttsFormOptions,
} from "@/features/text-to-speech/components/text-to-speech-form";
import { VoiceSelector } from "@/features/text-to-speech/components/voice-selector";

export function SettingsPanelSettings() {
  const form = useTypedAppFormContext(ttsFormOptions);
  const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);
  const isDefault = useSelector(form.store, (s) =>
    sliders.every((slider) => s.values[slider.id] === defaultTTSValues[slider.id]),
  );

  const reset = () => {
    for (const slider of sliders) {
      form.setFieldValue(slider.id, defaultTTSValues[slider.id]);
    }
  };

  return (
    <>
      <div className="border-b border-dashed p-4">
        <VoiceSelector />
      </div>

      <div className="flex-1 p-4">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Delivery</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            disabled={isDefault || isSubmitting}
            onClick={reset}
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </div>

        <FieldGroup className="gap-7">
          {sliders.map((slider) => (
            <form.Field key={slider.id} name={slider.id}>
              {(field) => (
                <Field>
                  <div className="flex items-baseline justify-between">
                    <FieldLabel>{slider.label}</FieldLabel>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {field.state.value.toFixed(slider.precision)}
                    </span>
                  </div>
                  <FieldDescription className="text-xs">{slider.description}</FieldDescription>
                  <Slider
                    aria-label={slider.label}
                    value={[field.state.value]}
                    onValueChange={(value) => field.handleChange(value[0])}
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    disabled={isSubmitting}
                    className="**:data-[slot=slider-thumb]:size-3 **:data-[slot=slider-thumb]:bg-foreground **:data-[slot=slider-track]:h-1"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{slider.leftLabel}</span>
                    <span className="text-xs text-muted-foreground">{slider.rightLabel}</span>
                  </div>
                </Field>
              )}
            </form.Field>
          ))}
        </FieldGroup>
      </div>
    </>
  );
}
