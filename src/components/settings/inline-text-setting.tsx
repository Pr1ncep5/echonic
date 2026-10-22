"use client";

import { useState } from "react";
import { settingsRowClassName } from "@/components/settings/settings-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

interface InlineTextSettingProps {
  id: string;
  label: string;
  value: string;
  onSave: (value: string) => void;
  isSaving?: boolean;
  disabled?: boolean;
  maxLength?: number;
  autoComplete?: string;
}

/** A settings row whose value is edited in place; Save appears only once it changes. */
export function InlineTextSetting({
  id,
  label,
  value,
  onSave,
  isSaving,
  disabled,
  maxLength,
  autoComplete,
}: InlineTextSettingProps) {
  const [draft, setDraft] = useState(value);
  const [savedValue, setSavedValue] = useState(value);

  // Reset the draft when the saved value changes underneath us (after a save or refetch).
  if (value !== savedValue) {
    setSavedValue(value);
    setDraft(value);
  }

  const trimmed = draft.trim();
  const isDirty = trimmed !== value && trimmed.length > 0;

  return (
    <form
      className={settingsRowClassName(false, "py-2")}
      onSubmit={(event) => {
        event.preventDefault();
        if (isDirty) onSave(trimmed);
      }}
    >
      <label htmlFor={id} className="w-28 shrink-0 text-sm font-medium tracking-tight">
        {label}
      </label>
      <Input
        id={id}
        value={draft}
        disabled={disabled}
        maxLength={maxLength}
        autoComplete={autoComplete}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setDraft(value);
        }}
        className="h-8 flex-1 border-transparent bg-transparent px-2 text-right shadow-none hover:bg-muted/60 focus-visible:bg-background focus-visible:text-left disabled:opacity-100"
      />
      {isDirty && (
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving && <Spinner />}
          Save
        </Button>
      )}
    </form>
  );
}
