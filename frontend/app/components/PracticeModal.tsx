"use client";

import { useEffect, useState } from "react";
import {
  BREATH_PHASES,
  type PracticeModalState,
  SENSORY_STEPS,
} from "../data/sanctuaryData";
import { Icon } from "./icons";
import { IconOrb } from "./ui/IconOrb";
import { ModalSheet } from "./ui/ModalSheet";
import {
  cx,
  kickerText,
  pillButton,
  practiceNote,
  practiceTitle,
  sensoryStepBox,
} from "./ui/styles";

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type PracticeModalProps = {
  modal: PracticeModalState;
  sensoryIndex: number;
  onSensoryIndexChange: (nextIndex: number) => void;
  onClose: () => void;
  onCompleteSensory: () => void;
};

export function PracticeModal({
  modal,
  sensoryIndex,
  onSensoryIndexChange,
  onClose,
  onCompleteSensory,
}: PracticeModalProps) {
  const [breathIndex, setBreathIndex] = useState(0);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(modal.durationSeconds ?? 0);
  const [timerRunning, setTimerRunning] = useState(false);

  const phases = modal.phases ?? BREATH_PHASES;

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- reset per-practice state when a new modal opens
    setBreathIndex(0);
    setDoneSteps([]);
    setSecondsLeft(modal.durationSeconds ?? 0);
    setTimerRunning(false);
  }, [modal]);

  useEffect(() => {
    if (modal.mode !== "breath") return;
    const timer = window.setTimeout(
      () => setBreathIndex((prev) => (prev + 1) % phases.length),
      phases[breathIndex % phases.length].ms ?? 3600,
    );
    return () => window.clearTimeout(timer);
  }, [modal, phases, breathIndex]);

  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;
    const id = window.setTimeout(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearTimeout(id);
  }, [timerRunning, secondsLeft]);

  function toggleGuideStep(idx: number) {
    setDoneSteps((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  }

  const activeBreath = phases[breathIndex % phases.length];
  // Let the circle move for the whole phase, so a long exhale looks long.
  const pacerStyle = {
    transitionDuration: `${(activeBreath.ms ?? 3600) - 200}ms`,
  };
  const activeSense = SENSORY_STEPS[sensoryIndex];

  return (
    <ModalSheet
      labelledBy="modal-title"
      closeLabel="Close practice guide"
      onClose={onClose}
    >
      <IconOrb icon={modal.icon} size={22} tone="tone-moss" />
      <span className={kickerText}>{modal.category}</span>
      <h2 id="modal-title" className={practiceTitle}>
        {modal.title}
      </h2>
      <p className="m-0 max-w-[30ch] text-[14px] leading-[1.48] text-ink-soft">
        {modal.description}
      </p>

      {modal.mode === "breath" && (
        <>
          <div
            className="relative my-2.5 flex size-42 items-center justify-center"
            aria-live="polite"
          >
            <div
              className={cx(
                "absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(194,235,223,0.65)_0%,rgba(255,219,210,0.42)_100%)] transition-[scale,opacity] duration-[3400ms] ease-[ease-in-out]",
                activeBreath.expand
                  ? "scale-114 opacity-100"
                  : "scale-76 opacity-68",
              )}
              style={pacerStyle}
            />
            <div
              className={cx(
                "relative z-1 flex size-27 flex-col items-center justify-center rounded-full bg-primary-container text-on-primary shadow-[0_10px_24px_rgba(58,96,87,0.25)] transition-[scale] duration-[3400ms] ease-[ease-in-out]",
                activeBreath.expand ? "scale-108" : "scale-90",
              )}
              style={pacerStyle}
            >
              <span className="text-[16px] font-semibold tracking-[0.01em]">
                {activeBreath.label}
              </span>
              <span className="mt-0.5 text-[11.5px] opacity-85">
                {activeBreath.cue}
              </span>
            </div>
          </div>
          {modal.tips && (
            <div className={sensoryStepBox}>
              {modal.tips.map((tip) => (
                <span key={tip} className={practiceNote}>
                  <Icon name="checkCircle" size={15} />
                  <span>{tip}</span>
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            className={pillButton({ full: true })}
            onClick={onClose}
          >
            Done
          </button>
        </>
      )}

      {modal.mode === "guide" && (
        <>
          {modal.durationSeconds !== undefined && modal.durationSeconds > 0 && (
            <div
              className="flex w-full items-center justify-between gap-2.5 rounded-full border border-outline/14 bg-surface-low py-2.5 pr-3 pl-3.5"
              aria-live="polite"
            >
              <div className="inline-flex items-center gap-1.75 text-primary">
                <Icon name="clock" size={16} />
                <span className="text-[15px] font-bold tabular-nums">
                  {secondsLeft === 0 && !timerRunning
                    ? "Complete"
                    : formatClock(secondsLeft)}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5">
                {secondsLeft !== modal.durationSeconds && (
                  <button
                    type="button"
                    className="rounded-full px-2.5 py-1.25 text-[12px] font-semibold text-ink-muted hover:bg-surface-container hover:text-ink"
                    onClick={() => {
                      setTimerRunning(false);
                      setSecondsLeft(modal.durationSeconds ?? 0);
                    }}
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  className={cx(
                    "inline-flex min-h-8 items-center gap-1.25 rounded-full px-3 py-1.25 text-[12.5px] font-semibold transition-colors duration-160",
                    timerRunning
                      ? "bg-primary-container text-on-primary"
                      : "bg-primary-fixed text-on-primary-fixed",
                  )}
                  onClick={() => {
                    if (secondsLeft === 0) {
                      setSecondsLeft(modal.durationSeconds ?? 0);
                      setTimerRunning(true);
                    } else {
                      setTimerRunning((v) => !v);
                    }
                  }}
                >
                  <Icon name={timerRunning ? "pause" : "play"} size={13} />
                  <span>
                    {timerRunning
                      ? "Pause"
                      : secondsLeft === 0
                        ? "Restart"
                        : "Start timer"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {modal.steps && modal.steps.length > 0 && (
            <div className="flex w-full flex-col gap-2">
              {modal.steps.map((step, idx) => {
                const isDone = doneSteps.includes(idx);
                return (
                  <button
                    key={step.title}
                    type="button"
                    className={cx(
                      "flex w-full items-center gap-2.75 rounded-lg border px-3 py-2.75 text-left transition-colors duration-160",
                      isDone
                        ? "border-secondary/25 bg-[rgba(197,236,204,0.45)]"
                        : "border-outline/10 bg-surface-low hover:bg-surface-container",
                    )}
                    aria-pressed={isDone}
                    onClick={() => toggleGuideStep(idx)}
                  >
                    <span
                      className={cx(
                        "inline-flex size-6.5 shrink-0 items-center justify-center rounded-full border text-[12px] font-bold",
                        isDone
                          ? "border-primary-container bg-primary-container text-on-primary"
                          : "border-outline/16 bg-surface-lowest text-primary",
                      )}
                    >
                      {isDone ? (
                        <Icon name="check" size={14} />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[14px] font-semibold text-ink">
                        {step.title}
                      </span>
                      <span className="text-[12.5px] leading-[1.38] text-ink-soft">
                        {step.detail}
                      </span>
                    </span>
                    {step.icon && (
                      <span className="shrink-0 text-ink-muted">
                        <Icon
                          name={step.icon}
                          size={18}
                          className="inline align-baseline"
                        />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {modal.tips && modal.tips.length > 0 && (
            <div className={sensoryStepBox}>
              {modal.tips.map((tip) => (
                <span key={tip} className={practiceNote}>
                  <Icon name="checkCircle" size={15} />
                  <span>{tip}</span>
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            className={pillButton({ variant: "primary", full: true })}
            onClick={onClose}
          >
            Done
          </button>
        </>
      )}

      {modal.mode === "sensory" && (
        <>
          <div
            className="my-1 flex justify-center gap-1.5"
            role="tablist"
            aria-label="Five senses"
          >
            {SENSORY_STEPS.map((s, idx) => (
              <button
                key={s.sense}
                type="button"
                role="tab"
                aria-selected={idx === sensoryIndex}
                aria-label={`${s.count} ${s.sense}`}
                className={cx(
                  "h-2.5 rounded-full p-0 transition-[width,background-color] duration-160",
                  idx === sensoryIndex
                    ? "w-6 bg-primary-container"
                    : "w-2.5 bg-outline-variant",
                )}
                onClick={() => onSensoryIndexChange(idx)}
              />
            ))}
          </div>
          <div className={sensoryStepBox} aria-live="polite">
            <span
              className={cx(kickerText, "inline-flex items-center gap-1.25")}
            >
              <Icon name={activeSense.icon} size={14} />
              <span>
                {activeSense.count} · {activeSense.sense}
              </span>
            </span>
            <strong className="text-[16px] text-ink">
              {activeSense.prompt}
            </strong>
            <span className="text-[13.5px] text-ink-soft">
              {activeSense.detail}
            </span>
          </div>
          <div className="flex w-full gap-2">
            {sensoryIndex < SENSORY_STEPS.length - 1 ? (
              <button
                type="button"
                className={pillButton({ variant: "primary", full: true })}
                onClick={() => onSensoryIndexChange(sensoryIndex + 1)}
              >
                Next ({SENSORY_STEPS[sensoryIndex + 1].count}{" "}
                {SENSORY_STEPS[sensoryIndex + 1].sense})
              </button>
            ) : (
              <button
                type="button"
                className={pillButton({ variant: "primary", full: true })}
                onClick={onCompleteSensory}
              >
                Finish reset
              </button>
            )}
          </div>
        </>
      )}
    </ModalSheet>
  );
}
