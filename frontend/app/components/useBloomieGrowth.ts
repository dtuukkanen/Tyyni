"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Bloomie's growth state follows today's tasks live: Today's Tiny Steps plus
 * the wins logged in the Sanctuary Jar, each win counting as one more done
 * task. Nothing done is Thirsty, some done is Perking up, everything done is
 * Flourishing. Moving up plays the celebration (with a toast); unchecking a
 * step moves Bloomie back down. `floor` keeps Bloomie from dropping below a
 * state (low-energy mode rests at Perking up: nothing needs to grow today).
 *
 * Demo overrides: `?growth=0..2` pins a state and `?growth=play` goes from
 * Thirsty to Flourishing on a timer, for screen recordings. The same overrides
 * can be picked in the app's settings sheet (`setDemo`); while one is active
 * the tasks don't move Bloomie.
 *
 * Until the page's data has loaded, `isSettling` is true so the flower can
 * jump to its real state without animating (the server render knows neither
 * the user's tasks nor the URL override).
 */

export type GrowthStage = 0 | 1 | 2;

export const GROWTH_STAGE_NAMES: Record<GrowthStage, string> = {
  0: "Thirsty",
  1: "Perking up",
  2: "Flourishing",
};

/** A pinned state, the timed "play" run, or `null` to follow the tasks. */
export type BloomieDemo = GrowthStage | "play" | null;

const PLAY_INTERVAL_MS = 4000;
const GROWING_MS = 2400;

export function stageFor(done: number, total: number): GrowthStage {
  if (total === 0 || done === 0) return 0;
  return done >= total ? 2 : 1;
}

function readOverride(): BloomieDemo {
  const value = new URLSearchParams(window.location.search).get("growth");
  if (value === "play") return "play";
  if (value !== null && /^[0-2]$/.test(value)) {
    return Number(value) as GrowthStage;
  }
  return null;
}

export function useBloomieGrowth({
  doneTasks,
  totalTasks,
  floor = 0,
  dataReady,
  onStageUp,
}: {
  doneTasks: number;
  totalTasks: number;
  /** The lowest state Bloomie shows, whatever is done. */
  floor?: GrowthStage;
  /** Whether the page's initial data (steps) has arrived. */
  dataReady: boolean;
  onStageUp?: (stage: GrowthStage) => void;
}) {
  const [override, setOverride] = useState<BloomieDemo>(null);
  const [playStage, setPlayStage] = useState<GrowthStage>(0);
  const [isGrowing, setIsGrowing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [settled, setSettled] = useState(false);

  const overrideRef = useRef<BloomieDemo>(null);
  const stageRef = useRef<GrowthStage>(0);
  const onStageUpRef = useRef(onStageUp);
  const floorRef = useRef(floor);
  const growTimerRef = useRef<number | null>(null);
  const playTimerRef = useRef<number | null>(null);

  const liveStage = Math.max(
    floor,
    stageFor(doneTasks, totalTasks),
  ) as GrowthStage;
  const stage: GrowthStage =
    override === "play" ? playStage : override !== null ? override : liveStage;

  useEffect(() => {
    stageRef.current = stage;
    onStageUpRef.current = onStageUp;
    floorRef.current = floor;
  });

  const celebrate = useCallback((to: GrowthStage, announce: boolean) => {
    setIsGrowing(true);
    if (growTimerRef.current) window.clearTimeout(growTimerRef.current);
    growTimerRef.current = window.setTimeout(
      () => setIsGrowing(false),
      GROWING_MS,
    );
    if (announce) onStageUpRef.current?.(to);
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
    const initialOverride = readOverride();
    overrideRef.current = initialOverride;
    // oxlint-disable-next-line react/set-state-in-effect -- the URL is read after hydration
    setOverride(initialOverride);
    setMounted(true);
    if (initialOverride === "play") startPlay();
    return () => {
      if (growTimerRef.current) window.clearTimeout(growTimerRef.current);
      stopPlay();
    };
  }, [startPlay, stopPlay]);

  // Turn transitions back on two frames after the real state has rendered, so
  // the browser has already applied it without animating.
  useEffect(() => {
    if (settled || !mounted || !dataReady) return;
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setSettled(true));
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [settled, mounted, dataReady]);

  /**
   * Call when the user changes their tasks, with the new counts; moving up a
   * state plays the celebration and announces it.
   */
  const tasksChanged = useCallback(
    (nextDone: number, nextTotal: number) => {
      if (overrideRef.current !== null) return;
      const to = Math.max(
        floorRef.current,
        stageFor(nextDone, nextTotal),
      ) as GrowthStage;
      if (to > stageRef.current) celebrate(to, true);
    },
    [celebrate],
  );

  /** Pick a demo override; going up plays the full celebration (no toast). */
  const setDemo = useCallback(
    (next: BloomieDemo) => {
      const from = stageRef.current;
      overrideRef.current = next;
      setOverride(next);
      if (next === "play") {
        startPlay();
        return;
      }
      stopPlay();
      const to = next ?? liveStage;
      if (to > from) celebrate(to, false);
    },
    [celebrate, liveStage, startPlay, stopPlay],
  );

  return {
    stage,
    demo: override,
    setDemo,
    tasksChanged,
    isGrowing,
    isSettling: !settled,
  };
}
