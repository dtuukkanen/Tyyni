"use client";

import type { ReactNode } from "react";
import { Icon } from "../icons";
import { cx } from "./styles";
import { useDismiss } from "./useDismiss";

type ModalSheetProps = {
  /** Id of the heading that names the dialog. */
  labelledBy: string;
  /** Accessible label of the close button. */
  closeLabel: string;
  onClose: () => void;
  /** `center` stacks content centered (practices); `start` left-aligns it. */
  align?: "center" | "start";
  children: ReactNode;
};

/** Bottom sheet over a dimmed backdrop; Escape, backdrop click and × close it. */
export function ModalSheet({
  labelledBy,
  closeLabel,
  onClose,
  align = "center",
  children,
}: ModalSheetProps) {
  useDismiss(true, onClose);

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click closes; Escape is handled on window
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/42 p-5 backdrop-blur-[6px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cx(
          "relative flex w-full max-w-[380px] flex-col overflow-hidden rounded-xl bg-surface-lowest px-5.5 pt-6.5 pb-5.5 shadow-[0_24px_48px_rgba(27,28,26,0.18)]",
          align === "center"
            ? "items-center gap-3 text-center"
            : "items-stretch gap-3.5 text-left",
        )}
      >
        <button
          type="button"
          className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-container hover:text-ink"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <Icon name="close" size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
