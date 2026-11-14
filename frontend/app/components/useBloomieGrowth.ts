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
 * The server renders the real state (tasks and the URL override are known
 * there). `isSettling` stays true for the first frames after hydration so
 * nothing animates in on load.
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

export function useBloomieGrowth({
  doneTasks,
  totalTasks,
  floor = 0,
  initialDemo = null,
  onStageUp,
}: {
  doneTasks: number;
  totalTasks: number;
  /** The lowest state Bloomie shows, whatever is done. */
  floor?: GrowthStage;
  /** The `?growth=` override from the URL, parsed on the server. */
  initialDemo?: BloomieDemo;
  onStageUp?: (stage: GrowthStage) => void;
}) {
  const [override, setOverride] = useState<BloomieDemo>(initialDemo);
  const [playStage, setPlayStage] = useState<GrowthStage>(0);
  const [isGrowing, setIsGrowing] = useState(false);
  const [settled, setSettled] = useState(false);

  const overrideRef = useRef<BloomieDemo>(initialDemo);
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

  // Play mode starts its timer once mounted; the initial demo only matters
  // on the first render, so later changes of the prop are ignored.
  const initialDemoRef = useRef(initialDemo);
  useEffect(() => {
    if (initialDemoRef.current === "play") startPlay();
    return () => {
      if (growTimerRef.current) window.clearTimeout(growTimerRef.current);
      stopPlay();
    };
  }, [startPlay, stopPlay]);

  // Turn transitions back on two frames after hydration, so the browser has
  // already painted the real state without animating.
  useEffect(() => {
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setSettled(true));
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, []);

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
