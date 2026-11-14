"use client";

import { type RefObject, useEffect, useEffectEvent } from "react";

/**
 * Calls `onDismiss` when Escape is pressed while `open`. With `ref`, a
 * pointer press outside that element dismisses too (popovers); without it,
 * only Escape does (modals handle their own backdrop click).
 */
export function useDismiss(
  open: boolean,
  onDismiss: () => void,
  ref?: RefObject<HTMLElement | null>,
) {
  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!ref?.current?.contains(e.target as Node)) dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    if (ref) window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (ref) window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, ref]);
}
