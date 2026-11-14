"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { IconOrb } from "./ui/IconOrb";
import { ScreenHero } from "./ui/ScreenHero";

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
    <main className="screen-body">
      <ScreenHero
        badge={<Icon name="pen" size={13} />}
        badgeLabel="QUIET PAGE"
        title="Just write."
        subtitle="No prompts, no right way. A single word is enough."
        green
      />

      {status === "saved" ? (
        <section className="journal-card journal-saved" aria-live="polite">
          <IconOrb icon="checkCircle" tone="tone-moss" />
          <p className="journal-saved-title">Saved.</p>
          <p className="journal-saved-sub">You can set it down now.</p>
          <button
            type="button"
            className="journal-again"
            onClick={() => setStatus("idle")}
          >
            Write another
          </button>
        </section>
      ) : (
        <form className="journal-card" onSubmit={handleSubmit}>
          <label htmlFor="journal-text" className="sr-only">
            Your journal entry
          </label>
          <textarea
            id="journal-text"
            className="journal-textarea"
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="What’s here right now?"
            maxLength={5000}
            rows={8}
          />
          {status === "error" && (
            <p className="journal-note" role="status">
              Couldn’t save just yet. Your words are still here; try again
              whenever you like.
            </p>
          )}
          <button
            type="submit"
            className="btn-primary-pill journal-save"
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
