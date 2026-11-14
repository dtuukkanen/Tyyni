"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { IconOrb } from "./ui/IconOrb";
import { ScreenHero } from "./ui/ScreenHero";
import { cx, pillButton, screenBody } from "./ui/styles";

const card = "flex flex-col rounded-lg border border-outline/10 bg-surface-low";

// The unsent draft stays on this device so leaving the tab loses nothing.
const DRAFT_KEY = "tyyni-journal-draft";

function readDraft(): string {
  try {
    return window.localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(text: string) {
  try {
    if (text) window.localStorage.setItem(DRAFT_KEY, text);
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage can be blocked; the draft then lives only in memory.
  }
}

type JournalScreenProps = {
  onSave: (text: string) => Promise<boolean>;
};

type Status = "idle" | "saving" | "saved" | "error";

export function JournalScreen({ onSave }: JournalScreenProps) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // The server can render this tab (`?tab=journal`) but can't see
  // localStorage, so the draft is restored after hydration.
  useEffect(() => {
    const draft = readDraft();
    // oxlint-disable-next-line react/set-state-in-effect -- localStorage is only readable after hydration
    if (draft) setText(draft);
  }, []);

  function handleChange(next: string) {
    setText(next);
    writeDraft(next);
    if (status === "error") setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || status === "saving") return;
    setStatus("saving");
    const ok = await onSave(text);
    if (ok) {
      setText("");
      writeDraft("");
      setStatus("saved");
    } else {
      setStatus("error");
    }
  }

  return (
    <main className={screenBody()}>
      <ScreenHero
        badge={<Icon name="pen" size={13} />}
        badgeLabel="QUIET PAGE"
        title="Just write."
        subtitle="No prompts, no right way. A single word is enough."
        green
      />

      {status === "saved" ? (
        <section
          className={cx(card, "items-center gap-1.5 px-5 py-8 text-center")}
          aria-live="polite"
        >
          <IconOrb icon="checkCircle" tone="tone-moss" />
          <p className="mt-2 mb-0 text-[20px] font-semibold text-primary">
            Saved.
          </p>
          <p className="m-0 text-ink-soft">You can set it down now.</p>
          <button
            type="button"
            className="mt-3 rounded-full px-3.5 py-2 text-[14px] font-semibold text-primary-container underline underline-offset-3 hover:bg-secondary-container/30"
            onClick={() => setStatus("idle")}
          >
            Write another
          </button>
        </section>
      ) : (
        <form className={cx(card, "gap-3.5 p-4")} onSubmit={handleSubmit}>
          <label htmlFor="journal-text" className="sr-only">
            Your journal entry
          </label>
          <textarea
            id="journal-text"
            className="field-sizing-content min-h-55 w-full resize-none rounded-md border border-outline/22 bg-surface-lowest px-4 py-3.5 text-[16px] leading-[1.6] text-ink transition-[border-color,box-shadow] outline-none placeholder:text-ink-muted focus:border-primary-container focus:shadow-[0_0_0_3px_rgba(58,96,87,0.12)]"
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="What’s here right now?"
            maxLength={5000}
            rows={8}
          />
          {status === "error" && (
            <p
              className="m-0 text-[14px] leading-[1.5] text-tertiary"
              role="status"
            >
              Couldn’t save just yet. Your words are still here; try again
              whenever you like.
            </p>
          )}
          <button
            type="submit"
            className={cx(
              pillButton({ variant: "primary" }),
              "min-w-30 self-end disabled:cursor-default disabled:opacity-45 disabled:hover:bg-primary-container",
            )}
            disabled={!text.trim() || status === "saving"}
          >
            <Icon name="spa" size={16} />
            <span>{status === "saving" ? "Saving…" : "Save"}</span>
          </button>
        </form>
      )}
    </main>
  );
}
