/**
 * Tailwind class strings shared across screens. Colors, radii, shadows and
 * animations come from the theme in `globals.css`.
 *
 * Variants are exclusive options rather than overrides: two utilities for the
 * same property on one element would leave the winner to stylesheet order.
 */

/** Joins the truthy class names. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Colour washes for orbs, avatars and pills. */
export type Tone =
  | "tone-moss"
  | "tone-eucalyptus"
  | "tone-blush"
  | "tone-linen";

export const TONE: Record<Tone, string> = {
  "tone-moss": "bg-secondary-container text-on-secondary-container",
  "tone-eucalyptus": "bg-primary-fixed text-on-primary-fixed",
  "tone-blush": "bg-tertiary-fixed text-on-tertiary-fixed",
  "tone-linen": "bg-surface-container text-ink-soft",
};

/** The scrolling body of a tab, between the top bar and the bottom nav. */
export function screenBody({ today = false } = {}): string {
  return cx(
    "relative z-10 flex flex-1 animate-screen-fade flex-col px-5 pb-27 max-[374px]:px-3.5",
    today ? "gap-4.5 pt-2.5 short:pt-2" : "gap-6 pt-4",
  );
}

export const sectionBlock = "flex flex-col gap-3";
export const sectionHeaderRow = "flex items-baseline justify-between gap-2.5";
export const sectionHeaderStack = "flex flex-col gap-0.75";
export const sectionLabel =
  "m-0 inline-flex items-center gap-2 text-[15px] font-semibold text-ink";
export const sectionHeading =
  "m-0 text-[19px] font-semibold tracking-[-0.01em] text-ink";
export const sectionMeta = "text-[12.5px] font-medium text-ink-muted";

export function statusDot({ muted = false } = {}): string {
  return cx(
    "inline-block size-1.75 rounded-full",
    muted ? "bg-outline" : "bg-secondary",
  );
}

export function durationPill({ moss = false } = {}): string {
  return cx(
    "shrink-0 rounded-full px-2.75 py-1 text-[12px] font-semibold whitespace-nowrap",
    moss
      ? "bg-secondary-container text-on-secondary-container"
      : "bg-surface-container text-ink-soft",
  );
}

export const eyebrowBadge =
  "inline-flex items-center gap-1.5 self-start rounded-full bg-secondary-container px-3 py-1.25 text-[12px] font-semibold tracking-[0.02em] text-on-secondary-container";

export const heroSubtitle =
  "m-0 max-w-[38ch] text-[16px] leading-[1.55] text-ink-soft";

export const kickerText =
  "text-[11.5px] font-bold tracking-[0.05em] text-primary-container uppercase";

export const practiceTitle =
  "m-0 text-[18.5px] leading-[1.3] font-semibold tracking-[-0.01em] text-ink";
export const practiceDesc =
  "mt-1 mb-0 text-[14px] leading-[1.48] text-ink-soft";
export const practiceNote =
  "inline-flex items-center gap-1.75 text-[13px] leading-[1.4] text-ink-muted";

export const sensoryStepBox =
  "flex w-full flex-col gap-2 rounded-lg bg-surface-low p-4 text-left";

/** Frosted glass card over the Today world. */
export const frostedSectionCard =
  "rounded-[28px] border border-white/72 bg-white/88 px-4.5 py-5 shadow-[0_14px_34px_-8px_rgba(34,72,64,0.1)] backdrop-blur-[16px]";

/** White panel card on the Wins and Anchor tabs. */
export const panelCard =
  "rounded-xl border border-outline/11 bg-surface-lowest p-4.5 shadow-pebble";

type PillOptions = {
  /**
   * `primary` is the filled call to action, `secondary` the quiet grey one,
   * `outline` a white secondary with a hairline border, `warm` the blush one.
   */
  variant?: "primary" | "secondary" | "outline" | "warm";
  /** Secondary pill switched on (playing, enabled). */
  active?: boolean;
  /** Height 44 px (`md`), 38 px (`tile`, side by side in a tile) or 36 px (`sm`, inside rows). */
  size?: keyof typeof PILL_SIZE;
  full?: boolean;
};

const PILL_SIZE = {
  md: "min-h-11 py-2.5 text-[14px]",
  tile: "min-h-9.5 px-3 py-1.75 text-[13px]",
  sm: "min-h-9 px-3.5 py-1.5 text-[13px]",
};

const PILL_VARIANT = {
  primary: "bg-primary-container text-on-primary hover:bg-primary",
  secondary: "bg-surface-container text-ink hover:bg-surface-high",
  outline:
    "border border-outline/16 bg-surface-lowest text-ink hover:bg-surface-high",
  warm: "bg-tertiary-fixed text-on-tertiary-fixed hover:bg-tertiary-fixed-dim",
};

/** A rounded pill button. */
export function pillButton({
  variant = "secondary",
  active = false,
  size = "md",
  full = false,
}: PillOptions = {}): string {
  return cx(
    "inline-flex items-center justify-center gap-1.75 rounded-full font-semibold whitespace-nowrap transition-colors",
    PILL_SIZE[size],
    size === "md" && (variant === "primary" ? "px-5" : "px-4.5"),
    active ? "bg-primary-container text-on-primary" : PILL_VARIANT[variant],
    full && "w-full",
  );
}
