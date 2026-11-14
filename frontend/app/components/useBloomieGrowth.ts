"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Bloomie's daily growth. Every completed moment (a tiny step, a mood
 * check-in, a wave, a started suggestion, a win, a finished practice) earns an
 * idempotent key; the number of distinct keys sets the growth state:
 * Thirsty, then Perking up, then Flourishing. Each UTC day starts Thirsty, an
 * invitation to care for the plant, and growth never goes down within a day.
 *
 * Demo overrides: `?growth=0..2` pins a state and `?growth=play` goes from
 * Thirsty to Flourishing on a timer, for screen recordings. The same overrides
 * can be picked in the app's settings sheet (`setDemo`). While an override is
 * active, completing tasks doesn't earn growth.
 *
 * Until the stored progress and the page's data have loaded, `isSettling` is
 * true so the flower can jump to its real stage without animating (the server
 * render knows neither the stored progress nor the URL override).
 */

export type GrowthStage = 0 | 1 | 2;

export const GROWTH_STAGE_NAMES: Record<GrowthStage, string> = {
  0: "Thirsty",
  1: "Perking up",
  2: "Flourishing",
};

/** Points needed to reach each state, indexed by state. */
const STAGE_THRESHOLDS = [0, 2, 5] as const;

const STORAGE_PREFIX = "tyyni.bloomie.";
const PLAY_INTERVAL_MS = 4000;
const GROWING_MS = 2400;

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

/** A pinned state, the timed "play" run, or `null` to follow real progress. */
export type BloomieDemo = GrowthStage | "play" | null;
type Override = BloomieDemo;

function readOverride(): Override {
  const value = new URLSearchParams(window.location.search).get("growth");
  if (value === "play") return "play";
  if (value !== null && /^[0-2]$/.test(value)) {
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
  const stageRef = useRef<GrowthStage>(0);
  const playTimerRef = useRef<number | null>(null);

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

  const stopPlay = useCallback(() => {
    if (playTimerRef.current) window.clearInterval(playTimerRef.current);
    playTimerRef.current = null;
  }, []);

  // Play mode grows one state per tick and skips toasts, so recordings stay clean.
  const startPlay = useCallback(() => {
    stopPlay();
    setPlayStage(0);
    let current = 0;
    playTimerRef.current = window.setInterval(() => {
      current += 1;
      setPlayStage(current as GrowthStage);
      celebrate(current as GrowthStage, false);
      if (current >= 2) stopPlay();
    }, PLAY_INTERVAL_MS);
  }, [celebrate, stopPlay]);

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
    if (initialOverride === "play") startPlay();
    return () => {
      if (growTimerRef.current) window.clearTimeout(growTimerRef.current);
      stopPlay();
    };
  }, [startPlay, stopPlay]);

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

  const earn = useCallback(
    (key: string) => {
      if (overrideRef.current !== null) return;
      // A tab left open past midnight (UTC) starts the new day Thirsty.
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

  useEffect(() => {
    stageRef.current = stage;
  });

  /** Pick a demo override; going up plays the full celebration (no toast). */
  const setDemo = useCallback(
    (next: Override) => {
      const from = stageRef.current;
      overrideRef.current = next;
      setOverride(next);
      if (next === "play") {
        startPlay();
        return;
      }
      stopPlay();
      const to =
        next ?? stageFor(countPoints(earnedRef.current, checkedRef.current));
      if (to > from) celebrate(to, false);
    },
    [celebrate, startPlay, stopPlay],
  );

  /** Forget today's growth and follow real progress again, from Thirsty. */
  const restartDay = useCallback(() => {
    stopPlay();
    earnedRef.current = [];
    dayRef.current = storageKey();
    overrideRef.current = null;
    setEarned([]);
    setOverride(null);
    writeEarned([]);
  }, [stopPlay]);

  return {
    stage,
    demo: override,
    setDemo,
    restartDay,
    isGrowing,
    isSettling: !settled,
    earn,
    earnStep,
  };
}
