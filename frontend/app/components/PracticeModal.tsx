"use client";

import { useEffect, useState } from "react";
import {
  BREATH_PHASES,
  type PracticeModalState,
  SENSORY_STEPS,
} from "../data/sanctuaryData";
import { Icon } from "./icons";

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (modal.mode !== "breath") return;
    // oxlint-disable-next-line react/set-state-in-effect -- restart the breath cycle when a new modal opens
    setBreathIndex(0);
    const timer = window.setInterval(() => {
      setBreathIndex((prev) => (prev + 1) % BREATH_PHASES.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [modal]);

  const activeBreath = BREATH_PHASES[breathIndex];
  const activeSense = SENSORY_STEPS[sensoryIndex];

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click closes; Escape is handled on window
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet">
        <button
          type="button"
          className="modal-close-btn"
          aria-label="Close grounding guide"
          onClick={onClose}
        >
          <Icon name="close" size={20} />
        </button>

        <span className="icon-orb icon-orb-round tone-moss">
          <Icon name={modal.icon} size={22} />
        </span>
        <span className="kicker-text">{modal.category}</span>
        <h2 id="modal-title" className="practice-title">
          {modal.title}
        </h2>
        <p className="practice-desc modal-description">{modal.description}</p>

        {modal.mode === "breath" ? (
          <>
            <div className="pacer-stage" aria-live="polite">
              <div
                className={`pacer-ring-outer ${
                  activeBreath.expand ? "phase-expand" : "phase-rest"
                }`}
              />
              <div
                className={`pacer-core ${
                  activeBreath.expand ? "phase-expand" : "phase-rest"
                }`}
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
              I’m grounded now
            </button>
          </>
        ) : (
          <>
            <div className="sensory-dots" aria-hidden="true">
              {SENSORY_STEPS.map((s, idx) => (
                <span
                  key={s.sense}
                  className={`sensory-dot ${
                    idx === sensoryIndex ? "is-current" : ""
                  }`}
                />
              ))}
            </div>
            <div className="sensory-step-box" aria-live="polite">
              <span className="kicker-text">
                {activeSense.count} · {activeSense.sense}
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
                  Next sense ({SENSORY_STEPS[sensoryIndex + 1].count}{" "}
                  {SENSORY_STEPS[sensoryIndex + 1].sense})
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary-pill btn-full"
                  onClick={onCompleteSensory}
                >
                  Complete gentle reset
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
