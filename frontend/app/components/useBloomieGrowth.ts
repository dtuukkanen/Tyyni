"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Bloomie's daily growth. Every completed moment (a tiny step, a mood
 * check-in, a wave, a started suggestion, a win, a finished practice) earns an
 * idempotent key; the number of distinct keys sets the growth stage. Growth
 * resets each UTC day and never goes down within a day, so nothing is ever
 * taken away from the user.
 *
 * Demo overrides: `?growth=0..4` pins a stage and `?growth=play` grows from
 * sprout to full bloom on a timer, for screen recordings. While an override is
 * active, completing tasks doesn't earn growth.
 *
 * Until the stored progress and the page's data have loaded, `isSettling` is
 * true so the flower can jump to its real stage without animating (the server
 * render knows neither the stored progress nor the URL override).
 */

export type GrowthStage = 0 | 1 | 2 | 3 | 4;

export const GROWTH_STAGE_NAMES: Record<GrowthStage, string> = {
  0: "Sprouting",
  1: "Leafing out",
  2: "Budding",
  3: "Blooming",
  4: "Flourishing",
};

/** Points needed to reach each stage, indexed by stage. */
const STAGE_THRESHOLDS = [0, 1, 2, 4, 6] as const;

const STORAGE_PREFIX = "tyyni.bloomie.";
const PLAY_INTERVAL_MS = 2500;
const GROWING_MS = 1800;

export function stageFor(points: number): GrowthStage {
  let stage = 0;
  STAGE_THRESHOLDS.forEach((threshold, index) => {
    if (points >= threshold) stage = index;
  });
  return stage as GrowthStage;
}

function stepKey(label: string) {
  return `step:${label}`;
}

function countPoints(earned: string[], checkedStepLabels: string[]) {
  return new Set([...earned, ...checkedStepLabels.map(stepKey)]).size;
}

function storageKey() {
  return `${STORAGE_PREFIX}${new Date().toISOString().slice(0, 10)}`;
}

function readEarned(): string[] {
  try {
    const today = storageKey();
    // Drop earlier days so storage holds a single entry.
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX) && key !== today) {
        window.localStorage.removeItem(key);
      }
    }
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(today) ?? "[]",
    );
    return Array.isArray(parsed)
      ? parsed.filter((k): k is string => typeof k === "string")
      : [];
  } catch {
    return [];
  }
}

function writeEarned(earned: string[]) {
  try {
    window.localStorage.setItem(storageKey(), JSON.stringify(earned));
  } catch {
    // Storage can be unavailable (private mode); growth then lasts the session.
  }
}

type Override = GrowthStage | "play" | null;

function readOverride(): Override {
  const value = new URLSearchParams(window.location.search).get("growth");
  if (value === "play") return "play";
  if (value !== null && /^[0-4]$/.test(value)) {
    return Number(value) as GrowthStage;
  }
  return null;
}

export function useBloomieGrowth({
  checkedStepLabels,
  dataReady,
  onStageUp,
}: {
  /** Labels of the steps checked right now; they count toward growth. */
  checkedStepLabels: string[];
  /** Whether the page's initial data (steps) has arrived. */
  dataReady: boolean;
  onStageUp?: (stage: GrowthStage) => void;
}) {
  const [earned, setEarned] = useState<string[]>([]);
  const [override, setOverride] = useState<Override>(null);
  const [playStage, setPlayStage] = useState<GrowthStage>(0);
  const [isGrowing, setIsGrowing] = useState(false);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [settled, setSettled] = useState(false);

  const earnedRef = useRef<string[]>([]);
  const dayRef = useRef("");
  const overrideRef = useRef<Override>(null);
  const checkedRef = useRef(checkedStepLabels);
  const onStageUpRef = useRef(onStageUp);
  const growTimerRef = useRef<number | null>(null);

  useEffect(() => {
    checkedRef.current = checkedStepLabels;
    onStageUpRef.current = onStageUp;
  });

  const celebrate = useCallback((stage: GrowthStage, announce: boolean) => {
    setIsGrowing(true);
    if (growTimerRef.current) window.clearTimeout(growTimerRef.current);
    growTimerRef.current = window.setTimeout(
      () => setIsGrowing(false),
      GROWING_MS,
    );
    if (announce) onStageUpRef.current?.(stage);
  }, []);

  useEffect(() => {
    const stored = readEarned();
    const initialOverride = readOverride();
    earnedRef.current = stored;
    dayRef.current = storageKey();
    overrideRef.current = initialOverride;
    // oxlint-disable-next-line react/set-state-in-effect -- localStorage and URL are read after hydration
    setEarned(stored);
    setOverride(initialOverride);
    setStorageLoaded(true);
    return () => {
      if (growTimerRef.current) window.clearTimeout(growTimerRef.current);
    };
  }, []);

  // Turn transitions back on two frames after the real stage has rendered, so
  // the browser has already applied it without animating.
  useEffect(() => {
    if (settled || !storageLoaded || !dataReady) return;
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setSettled(true));
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [settled, storageLoaded, dataReady]);

  // Play mode grows one stage per tick and skips toasts, so recordings stay clean.
  useEffect(() => {
    if (override !== "play") return;
    let current = 0;
    const timer = window.setInterval(() => {
      current += 1;
      setPlayStage(current as GrowthStage);
      celebrate(current as GrowthStage, false);
      if (current >= 4) window.clearInterval(timer);
    }, PLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [override, celebrate]);

  const earn = useCallback(
    (key: string) => {
      if (overrideRef.current !== null) return;
      // A tab left open past midnight (UTC) starts the new day from a sprout.
      if (dayRef.current !== storageKey()) {
        dayRef.current = storageKey();
        earnedRef.current = [];
      }
      const before = earnedRef.current;
      if (before.includes(key)) return;
      const next = [...before, key];
      earnedRef.current = next;
      setEarned(next);
      writeEarned(next);

      const fromStage = stageFor(countPoints(before, checkedRef.current));
      const toStage = stageFor(countPoints(next, checkedRef.current));
      if (toStage > fromStage) celebrate(toStage, true);
    },
    [celebrate],
  );

  const earnStep = useCallback((label: string) => earn(stepKey(label)), [earn]);

  const earnedStage = useMemo(
    () => stageFor(countPoints(earned, checkedStepLabels)),
    [earned, checkedStepLabels],
  );

  const stage: GrowthStage =
    override === "play"
      ? playStage
      : override !== null
        ? override
        : earnedStage;

  return {
    stage,
    stageName: GROWTH_STAGE_NAMES[stage],
    isGrowing,
    isSettling: !settled,
    earn,
    earnStep,
  };
}
