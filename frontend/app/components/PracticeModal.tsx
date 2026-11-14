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
      <span className="kicker-text">{modal.category}</span>
      <h2 id="modal-title" className="practice-title">
        {modal.title}
      </h2>
      <p className="practice-desc modal-description">{modal.description}</p>

      {modal.mode === "breath" && (
        <>
          <div className="pacer-stage" aria-live="polite">
            <div
              className={`pacer-ring-outer ${
                activeBreath.expand ? "phase-expand" : "phase-rest"
              }`}
              style={pacerStyle}
            />
            <div
              className={`pacer-core ${
                activeBreath.expand ? "phase-expand" : "phase-rest"
              }`}
              style={pacerStyle}
            >
              <span className="pacer-phase-label">{activeBreath.label}</span>
              <span className="pacer-sub-label">{activeBreath.cue}</span>
            </div>
          </div>
          {modal.tips && (
            <div className="sensory-step-box">
              {modal.tips.map((tip) => (
                <span key={tip} className="practice-note">
                  <Icon name="checkCircle" size={15} />
                  <span>{tip}</span>
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            className="btn-secondary-pill btn-full"
            onClick={onClose}
          >
            Done
          </button>
        </>
      )}

      {modal.mode === "guide" && (
        <>
          {modal.durationSeconds !== undefined && modal.durationSeconds > 0 && (
            <div className="guide-timer-bar" aria-live="polite">
              <div className="guide-timer-readout">
                <Icon name="clock" size={16} />
                <span className="guide-timer-clock">
                  {secondsLeft === 0 && !timerRunning
                    ? "Complete"
                    : formatClock(secondsLeft)}
                </span>
              </div>
              <div className="guide-timer-actions">
                {secondsLeft !== modal.durationSeconds && (
                  <button
                    type="button"
                    className="guide-timer-reset"
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
                  className={`guide-timer-btn ${
                    timerRunning ? "is-running" : ""
                  }`}
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
            <div className="guide-steps-list">
              {modal.steps.map((step, idx) => {
                const isDone = doneSteps.includes(idx);
                return (
                  <button
                    key={step.title}
                    type="button"
                    className={`guide-step-card ${isDone ? "is-done" : ""}`}
                    aria-pressed={isDone}
                    onClick={() => toggleGuideStep(idx)}
                  >
                    <span className="guide-step-check">
                      {isDone ? (
                        <Icon name="check" size={14} />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </span>
                    <span className="guide-step-copy">
                      <span className="guide-step-title">{step.title}</span>
                      <span className="guide-step-detail">{step.detail}</span>
                    </span>
                    {step.icon && (
                      <span className="guide-step-icon">
                        <Icon name={step.icon} size={18} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {modal.tips && modal.tips.length > 0 && (
            <div className="sensory-step-box">
              {modal.tips.map((tip) => (
                <span key={tip} className="practice-note">
                  <Icon name="checkCircle" size={15} />
                  <span>{tip}</span>
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            className="btn-primary-pill btn-full"
            onClick={onClose}
          >
            Done
          </button>
        </>
      )}

      {modal.mode === "sensory" && (
        <>
          <div className="sensory-dots" role="tablist" aria-label="Five senses">
            {SENSORY_STEPS.map((s, idx) => (
              <button
                key={s.sense}
                type="button"
                role="tab"
                aria-selected={idx === sensoryIndex}
                aria-label={`${s.count} ${s.sense}`}
                className={`sensory-dot ${
                  idx === sensoryIndex ? "is-current" : ""
                }`}
                onClick={() => onSensoryIndexChange(idx)}
              />
            ))}
          </div>
          <div className="sensory-step-box" aria-live="polite">
            <span className="kicker-text sensory-step-kicker">
              <Icon name={activeSense.icon} size={14} />
              <span>
                {activeSense.count} · {activeSense.sense}
              </span>
            </span>
            <strong className="sensory-prompt">{activeSense.prompt}</strong>
            <span className="sensory-detail">{activeSense.detail}</span>
          </div>
          <div className="modal-actions-row">
            {sensoryIndex < SENSORY_STEPS.length - 1 ? (
              <button
                type="button"
                className="btn-primary-pill btn-full"
                onClick={() => onSensoryIndexChange(sensoryIndex + 1)}
              >
                Next ({SENSORY_STEPS[sensoryIndex + 1].count}{" "}
                {SENSORY_STEPS[sensoryIndex + 1].sense})
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary-pill btn-full"
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
