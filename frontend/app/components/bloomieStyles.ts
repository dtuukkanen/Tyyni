/**
 * Tailwind classes for Bloomie's parts in each growth state (see
 * `useBloomieGrowth.ts` and `FlowerCompanion`). The state is picked in JS, so
 * a part's classes change when Bloomie grows and its CSS transition plays.
 *
 * Parts that arrive with a state grow in on a per-part stagger (`--d`, set
 * inline); dormant parts are hidden and shrink away without the stagger.
 * Thirsty (state 0) sets the wilted posture and olive colours.
 */

import { cx } from "./ui/styles";
import type { GrowthStage } from "./useBloomieGrowth";

export type GrowKind = "stem" | "leaf" | "sprig" | "bloom";

const GROW: Record<GrowKind, { shown: string; dormant: string }> = {
  // Stems draw themselves in from the soil.
  stem: {
    shown:
      "opacity-100 [stroke-dasharray:1_2] [stroke-dashoffset:0] [transition:stroke-dashoffset_950ms_cubic-bezier(0.45,0.05,0.25,1)_var(--d,0ms),opacity_120ms_linear_var(--d,0ms),stroke_1200ms_ease_700ms]",
    dormant:
      "opacity-0 [stroke-dasharray:1_2] [stroke-dashoffset:1] [transition:stroke-dashoffset_320ms_cubic-bezier(0.45,0.05,0.25,1),opacity_320ms_linear,stroke_320ms_ease]",
  },
  // Loose leaves (rim, vines) pop open around their center.
  leaf: {
    shown:
      "origin-center transform-[scale(1)] opacity-100 transform-fill [transition:transform_700ms_cubic-bezier(0.34,1.56,0.64,1)_var(--d,0ms),opacity_160ms_linear_var(--d,0ms)]",
    dormant:
      "origin-center transform-[scale(0)] opacity-0 transform-fill [transition:transform_280ms_cubic-bezier(0.34,1.56,0.64,1),opacity_280ms_linear]",
  },
  // Shoot leaves and buds sprout from their attachment point.
  sprig: {
    shown:
      "origin-[0_0] transform-[scale(1)] opacity-100 [transition:transform_750ms_cubic-bezier(0.34,1.56,0.64,1)_var(--d,0ms),opacity_160ms_linear_var(--d,0ms)]",
    dormant:
      "origin-[0_0] transform-[scale(0)] opacity-0 [transition:transform_300ms_cubic-bezier(0.34,1.56,0.64,1),opacity_300ms_linear]",
  },
  // Blossoms unfurl around their stem tip.
  bloom: {
    shown:
      "origin-[0_0] transform-[scale(1)_rotate(0deg)] opacity-100 [transition:transform_900ms_cubic-bezier(0.34,1.56,0.64,1)_var(--d,0ms),opacity_200ms_linear_var(--d,0ms)]",
    dormant:
      "origin-[0_0] transform-[scale(0)_rotate(-50deg)] opacity-0 [transition:transform_300ms_cubic-bezier(0.34,1.56,0.64,1),opacity_300ms_linear]",
  },
};

/** A part that is shown from state `from` (and, with `until`, hidden again from that state). */
export function grow(
  kind: GrowKind,
  stage: GrowthStage,
  from: GrowthStage,
  until?: GrowthStage,
): string {
  const shown = stage >= from && (until === undefined || stage < until);
  return shown ? GROW[kind].shown : GROW[kind].dormant;
}

/*
 * Posture: thirsty shoots lean at the soil, bend at the joint and nod at the
 * head; watering springs them upright base first, then joint, then head.
 */
const POSTURE = {
  lean: "transform-[rotate(var(--lean))]",
  bend: "transform-[rotate(var(--bend))]",
  nod: "transform-[rotate(var(--nod))]",
};

export function posture(joint: keyof typeof POSTURE, stage: GrowthStage) {
  return cx(
    "origin-[0_0] [transition:transform_1500ms_cubic-bezier(0.34,1.45,0.64,1)_var(--d,0ms)]",
    stage === 0 ? POSTURE[joint] : "transform-[rotate(0deg)]",
  );
}

export function leafDroop(stage: GrowthStage) {
  return cx(
    "origin-[0_0] [transition:transform_1300ms_cubic-bezier(0.34,1.4,0.64,1)_800ms]",
    stage === 0
      ? "transform-[rotate(var(--droop))]"
      : "transform-[rotate(0deg)]",
  );
}

/* Colours: olive and pale when thirsty, green once watered. */

export function stem(stage: GrowthStage) {
  return stage === 0 ? "stroke-[#857a48]" : "stroke-[#465937]";
}

const BLADE_FILL = {
  a: { thirsty: "fill-[#bdb26a]", green: "fill-[#82b667]" },
  b: { thirsty: "fill-[#c8ba70]", green: "fill-[#95c777]" },
  c: { thirsty: "fill-[#d2c27c]", green: "fill-[#9fd07f]" },
};

export function leafBlade(tone: keyof typeof BLADE_FILL, stage: GrowthStage) {
  return cx(
    "[transition:fill_1200ms_ease_700ms,stroke_1200ms_ease_700ms]",
    stage === 0
      ? cx(BLADE_FILL[tone].thirsty, "stroke-[#6e6240]")
      : cx(BLADE_FILL[tone].green, "stroke-[#435435]"),
  );
}

export function leafRib(stage: GrowthStage) {
  return cx(
    "opacity-55 [transition:stroke_1200ms_ease_700ms]",
    stage === 0 ? "stroke-[#8a7a48]" : "stroke-[#5e7d4a]",
  );
}

/** The brown, dried tip of a thirsty leaf. */
export function leafTip(stage: GrowthStage) {
  return cx(
    "fill-[#a8743e] [transition:opacity_900ms_ease_700ms]",
    stage === 0 ? "opacity-100" : "opacity-0",
  );
}

export function bud(stage: GrowthStage) {
  return cx(
    "[transition:fill_1200ms_ease_700ms]",
    stage === 0 ? "fill-[#d9b2a6]" : "fill-[#f7a3a8]",
  );
}

export function sepal(stage: GrowthStage) {
  return cx(
    "[transition:fill_1200ms_ease_700ms,stroke_1200ms_ease_700ms]",
    stage === 0
      ? "fill-[#b8ae68] stroke-[#6e6240]"
      : "fill-[#82b667] stroke-[#435435]",
  );
}

export function soil(stage: GrowthStage) {
  return cx(
    "[transition:fill_1100ms_ease_450ms]",
    stage === 0 ? "fill-[#a88566]" : "fill-[#5e3f30]",
  );
}

export function soilCracks(stage: GrowthStage) {
  return cx(
    "stroke-[#7a5a40] [transition:opacity_600ms_ease_500ms]",
    stage === 0 ? "opacity-100" : "opacity-0",
  );
}

/** Pot face for state `face`, cross-faded in once the plant has perked up. */
export function potFace(face: GrowthStage, stage: GrowthStage) {
  return cx(
    stage === 2
      ? "[transition:opacity_500ms_ease_250ms]"
      : "[transition:opacity_500ms_ease_900ms]",
    stage === face ? "opacity-100" : "opacity-0",
  );
}

const CHEEKS = ["opacity-35", "opacity-90", "opacity-100"];

export function cheeks(stage: GrowthStage) {
  return cx("[transition:opacity_800ms_ease_900ms]", CHEEKS[stage]);
}

/* Thirsty props: fallen leaves blow away and the thought bubble pops once watered. */

const BLOWN_AWAY = {
  left: "transform-[translate(-40px,-36px)_rotate(-150deg)] opacity-0",
  right: "transform-[translate(-28px,46px)_rotate(150deg)] opacity-0",
};

export function fallenLeaf(side: keyof typeof BLOWN_AWAY, stage: GrowthStage) {
  return cx(
    "origin-[11px_0] [transition:transform_1400ms_cubic-bezier(0.3,0.7,0.4,1)_250ms,opacity_900ms_ease_650ms]",
    stage === 0 ? "transform-none opacity-100" : BLOWN_AWAY[side],
  );
}

export function thoughtBubble(stage: GrowthStage) {
  return cx(
    "origin-[26px_40px]",
    stage === 0
      ? "transform-[scale(1)] opacity-100 [transition:transform_700ms_cubic-bezier(0.34,1.56,0.64,1)_400ms,opacity_200ms_ease_400ms]"
      : "transform-[scale(0)] opacity-0 [transition:transform_450ms_cubic-bezier(0.55,0,0.75,0.3),opacity_300ms_ease_150ms]",
  );
}

/* The glow behind Bloomie: faint while thirsty, golden in full bloom. */

const AURA = [
  "size-[62%] bg-[radial-gradient(circle,rgba(255,250,232,0.34)_0%,rgba(255,250,232,0)_70%)]",
  "size-[84%] bg-[radial-gradient(circle,rgba(255,252,224,0.58)_0%,rgba(255,252,224,0)_72%)]",
  "size-[104%] bg-[radial-gradient(circle,rgba(255,236,160,0.78)_0%,rgba(255,214,204,0.4)_46%,rgba(255,236,160,0)_74%)]",
];

export function aura(stage: GrowthStage, growing: boolean) {
  return cx(
    "absolute rounded-full",
    AURA[stage],
    growing ? "animate-aura-flash" : "animate-aura-pulse",
  );
}

/** The ring that expands when Bloomie moves up a state. */
export function growthBurst(stage: GrowthStage, growing: boolean) {
  return cx(
    "pointer-events-none absolute aspect-square w-[70%] rounded-full border-3 opacity-0",
    stage === 1
      ? "border-[rgba(214,244,222,0.95)] shadow-[0_0_18px_rgba(150,214,170,0.75)]"
      : "border-[rgba(255,244,196,0.95)] shadow-[0_0_18px_rgba(252,225,129,0.75)]",
    growing && "animate-growth-burst",
  );
}

/** Floating pollen around Bloomie; `extra` ones only show in full bloom. */
export const SPARKLES = [
  { place: "top-[36%] left-[22%] size-1.75 [--delay:0s]", extra: false },
  { place: "top-[30%] left-[76%] size-1.5 [--delay:-1.9s]", extra: false },
  { place: "top-[14%] left-[52%] size-2 [--delay:-3.6s]", extra: false },
  { place: "top-[58%] left-[12%] size-1.5 [--delay:-0.8s]", extra: true },
  { place: "top-[52%] left-[86%] size-1.75 [--delay:-2.7s]", extra: true },
  { place: "top-[6%] left-[36%] size-1.25 [--delay:-4.4s]", extra: true },
];

export function sparkle(
  place: string,
  extra: boolean,
  stage: GrowthStage,
  growing: boolean,
  celebrating: boolean,
) {
  // No pollen while thirsty; a burst of it while growing.
  const shown = stage !== 0 && (!extra || stage === 2 || growing);
  return cx(
    "absolute rounded-full opacity-0",
    place,
    !shown && "hidden",
    growing
      ? "animate-sparkle-burst bg-[#fff4c4] shadow-[0_0_12px_rgba(252,225,129,1)]"
      : celebrating
        ? "animate-sparkle-celebrate bg-[#f79ca2] shadow-[0_0_10px_rgba(247,156,162,0.9)]"
        : "animate-sparkle bg-[#fffdf2] shadow-[0_0_8px_rgba(252,225,129,0.9)]",
  );
}

/** Each shoot's sway, keyed by the name in its spec. */
export const STEM_SWAY = {
  left: "origin-[0_0] animate-stem-left",
  midLeft: "origin-[0_0] animate-stem-mid-left",
  center: "origin-[0_0] animate-stem-center",
  midRight: "origin-[0_0] animate-stem-mid-right",
  right: "origin-[0_0] animate-stem-right",
};
