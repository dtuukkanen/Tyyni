"use client";

import { type ReactNode, useState } from "react";

type CapsuleFormProps = {
  /** Input id, also used by the visually hidden label. */
  id: string;
  label: string;
  placeholder: string;
  /** Accessible label of the round submit button. */
  submitLabel: string;
  /** Icon inside the submit button. */
  submitIcon: ReactNode;
  /** Optional icon before the input. */
  leading?: ReactNode;
  /** Focus the field on mount; only for fields the user just asked to open. */
  focusOnOpen?: boolean;
  /** Called with the trimmed text when it isn't empty; the field then clears. */
  onSubmit: (text: string) => void;
};

/** A one-line pill input with a round submit button. */
export function CapsuleForm({
  id,
  label,
  placeholder,
  submitLabel,
  submitIcon,
  leading,
  focusOnOpen = false,
  onSubmit,
}: CapsuleFormProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <form
      className="flex min-h-12.5 items-center gap-2 rounded-full border border-outline/22 bg-surface-container py-1.25 pr-1.5 pl-4 transition-[border-color,box-shadow] focus-within:border-primary-container focus-within:shadow-[0_0_0_3px_rgba(58,96,87,0.12)]"
      onSubmit={handleSubmit}
    >
      {leading}
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        className="min-w-0 flex-1 border-0 bg-transparent px-0.5 py-0.25 text-[15px] text-ink outline-none placeholder:text-ink-muted"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- only set where the field appears after the user asks for it
        autoFocus={focusOnOpen}
      />
      <button
        type="submit"
        className="inline-flex size-9.5 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary transition-colors hover:bg-primary"
        aria-label={submitLabel}
      >
        {submitIcon}
      </button>
    </form>
  );
}
