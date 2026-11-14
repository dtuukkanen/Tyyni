"use client";

import type { ReactNode } from "react";
import { Icon } from "../icons";
import { useDismiss } from "./useDismiss";

type ModalSheetProps = {
  /** Id of the heading that names the dialog. */
  labelledBy: string;
  /** Accessible label of the close button. */
  closeLabel: string;
  onClose: () => void;
  /** Extra class on the sheet, next to `modal-sheet`. */
  className?: string;
  children: ReactNode;
};

/** Bottom sheet over a dimmed backdrop; Escape, backdrop click and × close it. */
export function ModalSheet({
  labelledBy,
  closeLabel,
  onClose,
  className,
  children,
}: ModalSheetProps) {
  useDismiss(true, onClose);

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click closes; Escape is handled on window
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={className ? `modal-sheet ${className}` : "modal-sheet"}>
        <button
          type="button"
          className="modal-close-btn"
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
