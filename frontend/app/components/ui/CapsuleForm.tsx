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
    <form className="capsule-form" onSubmit={handleSubmit}>
      {leading}
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        className="capsule-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- only set where the field appears after the user asks for it
        autoFocus={focusOnOpen}
      />
      <button type="submit" className="capsule-submit" aria-label={submitLabel}>
        {submitIcon}
      </button>
    </form>
  );
}
