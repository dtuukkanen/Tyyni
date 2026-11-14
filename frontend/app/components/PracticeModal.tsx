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

  const phases = modal.phases ?? BREATH_PHASES;

  useEffect(() => {
    if (modal.mode !== "breath") return;
    // oxlint-disable-next-line react/set-state-in-effect -- restart the breath cycle when a new modal opens
    setBreathIndex(0);
  }, [modal]);

  useEffect(() => {
    if (modal.mode !== "breath") return;
    const timer = window.setTimeout(
      () => setBreathIndex((prev) => (prev + 1) % phases.length),
      phases[breathIndex % phases.length].ms ?? 3600,
    );
    return () => window.clearTimeout(timer);
  }, [modal, phases, breathIndex]);

  const activeBreath = phases[breathIndex % phases.length];
  // Let the circle move for the whole phase, so a long exhale looks long.
  const pacerStyle = {
    transitionDuration: `${(activeBreath.ms ?? 3600) - 200}ms`,
  };
  const activeSense = SENSORY_STEPS[sensoryIndex];

  return (
    <ModalSheet
      labelledBy="modal-title"
      closeLabel="Close grounding guide"
      onClose={onClose}
    >
      <IconOrb icon={modal.icon} size={22} tone="tone-moss" />
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
    </ModalSheet>
  );
}
