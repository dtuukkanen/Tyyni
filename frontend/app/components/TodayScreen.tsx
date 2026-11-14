"use client";

import { useEffect, useRef, useState } from "react";
import type { ResolvedBehavioralNudge } from "../data/behavioralNudges";
import {
  CIRCLE_MEMBERS,
  LOW_ENERGY_STEPS,
  MOOD_OPTIONS,
  STEP_ICONS,
} from "../data/sanctuaryData";
import { Icon } from "./icons";

const NO_NUDGES: ResolvedBehavioralNudge[] = [];

/** Short first-person lines Bloomie says, matched to how the user arrived. */
const BLOOMIE_LINES: Record<string, string[]> = {
  lowEnergy: [
    "I’m resting with you. Nothing needs to grow today.",
    "Slow is still growing. I’ll keep watch.",
    "Roots do their best work in the quiet.",
  ],
  Tired: [
    "Tired roots still hold. Rest is welcome here.",
    "Let’s both take it slow today.",
    "I’ll stay close while you recharge.",
  ],
  Tender: [
    "I’m leaning in close. Go gently today.",
    "Soft petals are still petals.",
    "You don’t have to be okay to be here with me.",
  ],
  Steady: [
    "Steady soil is all I need.",
    "Quiet days help roots grow deep.",
    "I like growing next to you.",
  ],
  Light: [
    "I’m soaking up the sun with you.",
    "Look, a new leaf. Today feels open.",
    "Let’s enjoy this lightness together.",
  ],
};

function bloomieLine(
  mood: string,
  lowEnergy: boolean,
  tended: number,
  index: number,
) {
  const pool =
    BLOOMIE_LINES[lowEnergy ? "lowEnergy" : mood] ?? BLOOMIE_LINES.Steady;
  // Once a step is tended, Bloomie notices it first.
  const lines =
    tended > 0 && !lowEnergy
      ? [
          `${tended} tiny step${tended === 1 ? "" : "s"} tended. I can feel it in my roots.`,
          ...pool,
        ]
      : pool;
  return lines[index % lines.length];
}

type TodayScreenProps = {
  guestName: string;
  dateLabel: string;
  lowEnergy: boolean;
  onExitLowEnergy: () => void;
  behavioralNudges: ResolvedBehavioralNudge[];
  activeNudgeIndex: number;
  onCycleNudge: () => void;
  onDismissNudge: (nudge: ResolvedBehavioralNudge) => void;
  onStartNudge: (nudge: ResolvedBehavioralNudge) => void;
  onMarkNudgeHelped: (nudge: ResolvedBehavioralNudge) => void;
  mood: string;
  onSelectMood: (moodId: string) => void;
  steps: string[];
  checked: number[];
  onToggleStep: (index: number) => void;
  onAddStep: (label: string) => void;
  restChecked: number[];
  onToggleRestStep: (index: number) => void;
  lowEnergySoundOn: boolean;
  onToggleLowEnergySound: () => void;
  onStartSlowExhale: () => void;
  restingShared: boolean;
  onShareResting: () => void;
  waveSent: boolean;
  onSendWave: () => void;
  warmthSentTo: string[];
  onSendWarmth: (name: string) => void;
  onInteractCompanion: () => void;
};

export function TodayScreen({
  guestName,
  dateLabel,
  lowEnergy,
  onExitLowEnergy,
  behavioralNudges = NO_NUDGES,
  activeNudgeIndex = 0,
  onCycleNudge,
  onDismissNudge,
  onStartNudge,
  onMarkNudgeHelped,
  mood,
  onSelectMood,
  steps,
  checked,
  onToggleStep,
  onAddStep,
  restChecked,
  onToggleRestStep,
  lowEnergySoundOn,
  onToggleLowEnergySound,
  onStartSlowExhale,
  restingShared,
  onShareResting,
  waveSent,
  onSendWave,
  warmthSentTo,
  onSendWarmth,
  onInteractCompanion,
}: TodayScreenProps) {
  const [addingStep, setAddingStep] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [bloomieIndex, setBloomieIndex] = useState(0);
  const [moodInfoOpen, setMoodInfoOpen] = useState(false);
  const moodInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moodInfoOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoodInfoOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!moodInfoRef.current?.contains(e.target as Node)) {
        setMoodInfoOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [moodInfoOpen]);

  const tended = checked.filter((i) => i < steps.length).length;
  const shownSteps = Math.min(steps.length, 5);
  const checkedInCount = CIRCLE_MEMBERS.filter((p) => p.feeling).length;

  const activeNudge =
    behavioralNudges.length > 0
      ? behavioralNudges[activeNudgeIndex % behavioralNudges.length]
      : null;

  function handleStepSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newStep.trim();
    if (!trimmed) return;
    onAddStep(trimmed);
    setNewStep("");
    setAddingStep(false);
  }

  return (
    <main className="screen-body today-world-body">
      {/* 1. First Fold: Greeting / Optional Behavioral Nudge, Bloomie Showcase & Check-In */}
      <section className="today-hero-fold">
        <div className="today-hero-top">
          <div className="top-meta-row">
            <span className="date-pill date-pill-frosted">
              <Icon name="calendar" size={14} />
              <span>{dateLabel}</span>
            </span>
          </div>

          <div
            className={`hero-greeting-card ${
              activeNudge || lowEnergy ? "has-behavioral-nudge" : ""
            } ${lowEnergy ? "is-low-energy-card" : ""}`}
          >
            {lowEnergy ? (
              <>
                <span className="nudge-badge nudge-tone-moss">
                  <Icon name="lowEnergy" size={12} />
                  <span>Low-energy mode</span>
                </span>
                <h1 className="hero-title">
                  Running low is okay, {guestName}.
                </h1>
                <p className="hero-subtitle">
                  Tyyni has gone quiet: fewer choices, slower motion. Pick one
                  thing, or simply rest.
                </p>
                <div className="rest-support-grid">
                  <button
                    type="button"
                    className="rest-support-btn"
                    onClick={onStartSlowExhale}
                  >
                    <Icon name="air" size={18} />
                    <span className="rest-support-label">Slow exhale</span>
                    <span className="rest-support-hint">1 minute</span>
                  </button>
                  <button
                    type="button"
                    className={`rest-support-btn ${
                      lowEnergySoundOn ? "is-on" : ""
                    }`}
                    aria-pressed={lowEnergySoundOn}
                    onClick={onToggleLowEnergySound}
                  >
                    <Icon
                      name={lowEnergySoundOn ? "pause" : "waves"}
                      size={18}
                    />
                    <span className="rest-support-label">Soft noise</span>
                    <span className="rest-support-hint">
                      {lowEnergySoundOn ? "Playing" : "Mutes the day"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`rest-support-btn ${
                      restingShared ? "is-on" : ""
                    }`}
                    aria-pressed={restingShared}
                    onClick={onShareResting}
                  >
                    <Icon name={restingShared ? "check" : "users"} size={18} />
                    <span className="rest-support-label">
                      {restingShared ? "Circle knows" : "I’m resting"}
                    </span>
                    <span className="rest-support-hint">
                      {restingShared ? "No replies expected" : "Tell my circle"}
                    </span>
                  </button>
                </div>
              </>
            ) : activeNudge ? (
              <>
                <div className="nudge-top-row">
                  <span
                    className={`nudge-badge nudge-tone-${activeNudge.tone}`}
                  >
                    <Icon
                      name={activeNudge.tone === "blush" ? "heart" : "spa"}
                      size={12}
                    />
                    <span>{activeNudge.badgeLabel}</span>
                  </span>

                  <div className="nudge-meta-controls">
                    {behavioralNudges.length > 1 && (
                      <button
                        type="button"
                        className="nudge-ghost-btn"
                        onClick={onCycleNudge}
                        aria-label="Show next gentle suggestion"
                      >
                        {(activeNudgeIndex % behavioralNudges.length) + 1}/
                        {behavioralNudges.length} · Next
                      </button>
                    )}
                    <button
                      type="button"
                      className="nudge-ghost-btn"
                      onClick={() => onDismissNudge(activeNudge)}
                      aria-label="Dismiss suggestion for now"
                    >
                      Later
                    </button>
                  </div>
                </div>

                <h1 className="hero-title">{activeNudge.headline}</h1>
                <p className="hero-subtitle">{activeNudge.subtitle}</p>

                {activeNudge.reason && (
                  <p className="nudge-reason">{activeNudge.reason}</p>
                )}

                <div className="nudge-actions-row">
                  <button
                    type="button"
                    className={`nudge-primary-btn ${
                      activeNudge.tone === "blush" ? "is-warm" : ""
                    }`}
                    onClick={() => onStartNudge(activeNudge)}
                  >
                    <Icon name={activeNudge.ctaIcon} size={15} />
                    <span>{activeNudge.ctaLabel}</span>
                  </button>

                  {activeNudge.done && (
                    <button
                      type="button"
                      className={`nudge-helped-btn ${
                        activeNudge.helped ? "is-helped" : ""
                      }`}
                      aria-pressed={Boolean(activeNudge.helped)}
                      onClick={() => onMarkNudgeHelped(activeNudge)}
                    >
                      <Icon name="check" size={13} />
                      <span>
                        {activeNudge.helped ? "Helped" : "This helped"}
                      </span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1 className="hero-title">Good morning, {guestName}.</h1>
                <p className="hero-subtitle">
                  Take a slow breath. You don’t have to carry tomorrow today.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Open Scenic Window for Bloomie, with Status Pill Resting Below the Pot */}
        <div className="companion-stage-window">
          <button
            type="button"
            className="companion-status-pill"
            aria-label="Bloomie, your companion. Tap to hear from Bloomie."
            onClick={() => {
              setBloomieIndex((i) => i + 1);
              onInteractCompanion();
            }}
          >
            <span className="companion-status-orb">
              <Icon name="sprout" size={16} />
            </span>
            <span className="companion-status-copy">
              <span className="companion-status-title-row">
                <span className="companion-status-title">Bloomie</span>
                {shownSteps > 0 && !lowEnergy && (
                  <span
                    className="bloomie-leaf-meter"
                    role="img"
                    aria-label={`${tended} of ${steps.length} tiny steps tended`}
                  >
                    {Array.from({ length: shownSteps }, (_, i) => (
                      <span
                        // oxlint-disable-next-line react/no-array-index-key -- fixed-length meter
                        key={i}
                        className={`bloomie-leaf ${i < tended ? "is-grown" : ""}`}
                      />
                    ))}
                  </span>
                )}
              </span>
              <span className="companion-status-sub" aria-live="polite">
                “{bloomieLine(mood, lowEnergy, tended, bloomieIndex)}”
              </span>
            </span>
          </button>
        </div>

        {/* Bottom of Hero Fold: Somatic Arrival Check-In & Scroll Cue */}
        <div className="today-checkin-dock">
          <section className="section-block" aria-labelledby="checkin-heading">
            <div className="checkin-heading-row" ref={moodInfoRef}>
              <h2
                id="checkin-heading"
                className="section-label checkin-frosted-heading"
              >
                How are you arriving today?
              </h2>
              <button
                type="button"
                className="mood-info-btn"
                aria-label="What do these feelings mean?"
                aria-expanded={moodInfoOpen}
                aria-controls="mood-info-panel"
                onClick={() => setMoodInfoOpen((v) => !v)}
              >
                <Icon name="info" size={16} />
              </button>

              {moodInfoOpen && (
                <div
                  id="mood-info-panel"
                  className="mood-info-popover"
                  role="dialog"
                  aria-label="What the feelings mean"
                >
                  <ul className="mood-info-list">
                    {MOOD_OPTIONS.map((option) => (
                      <li key={option.id} className="mood-info-item">
                        <span className="mood-icon-wrap">
                          <Icon name={option.icon} size={14} />
                        </span>
                        <span>
                          <strong>{option.label}</strong> · {option.meaning}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mood-info-foot">
                    There’s no wrong answer. It helps Tyyni and Bloomie meet you
                    where you are.
                  </p>
                </div>
              )}
            </div>

            <div
              className="mood-grid"
              role="group"
              aria-label="Somatic arrival state"
            >
              {MOOD_OPTIONS.map((option) => {
                const isSelected = mood === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    className={`mood-chip mood-chip-frosted ${
                      isSelected ? "is-selected" : ""
                    }`}
                    onClick={() => onSelectMood(option.id)}
                  >
                    <span className="mood-icon-wrap">
                      <Icon name={option.icon} size={15} />
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="scroll-cue-row">
            <a href="#today-steps" className="scroll-down-cue">
              <span>Scroll for today’s gentle steps</span>
              <Icon name="arrowDown" size={14} className="scroll-cue-arrow" />
            </a>
          </div>
        </div>
      </section>

      {/* 2. Scrolled Content Section: Frosted Glass Sanctuary Cards */}
      <div id="today-steps" className="today-scrolled-sections">
        <section
          className="section-block frosted-section-card"
          aria-labelledby="tiny-steps-heading"
        >
          <div className="section-header-stack">
            <h2 id="tiny-steps-heading" className="section-label">
              <span>
                {lowEnergy ? "Just the Basics" : "Tiny Steps for Today"}
              </span>
              <span className="status-dot" aria-hidden="true" />
            </h2>
            <span className="section-meta">
              {lowEnergy
                ? "Basic needs first. Everything else can wait."
                : "No streaks · No penalties"}
            </span>
          </div>

          <div className="steps-stack">
            {lowEnergy
              ? LOW_ENERGY_STEPS.map((step, index) => {
                  const isDone = restChecked.includes(index);
                  return (
                    <button
                      key={step.label}
                      type="button"
                      className={`step-card ${isDone ? "is-done" : ""}`}
                      aria-pressed={isDone}
                      onClick={() => onToggleRestStep(index)}
                    >
                      <span className="step-check">
                        <Icon name="check" size={16} />
                      </span>
                      <span className="step-text">{step.label}</span>
                      <span className="step-trailing-icon">
                        <Icon name={step.icon} size={20} />
                      </span>
                    </button>
                  );
                })
              : steps.map((step, index) => {
                  const isDone = checked.includes(index);
                  const iconName = STEP_ICONS[index % STEP_ICONS.length];
                  return (
                    <button
                      // oxlint-disable-next-line react/no-array-index-key -- steps are plain strings and may repeat
                      key={`${step}-${index}`}
                      type="button"
                      className={`step-card ${isDone ? "is-done" : ""}`}
                      aria-pressed={isDone}
                      onClick={() => onToggleStep(index)}
                    >
                      <span className="step-check">
                        <Icon name="check" size={16} />
                      </span>
                      <span className="step-text">{step}</span>
                      <span className="step-trailing-icon">
                        <Icon name={iconName} size={20} />
                      </span>
                    </button>
                  );
                })}
          </div>

          {lowEnergy ? (
            <button
              type="button"
              className="soft-add-trigger"
              onClick={onExitLowEnergy}
            >
              <span>I have a bit more energy: show my usual steps</span>
            </button>
          ) : !addingStep ? (
            <button
              type="button"
              className="soft-add-trigger"
              onClick={() => setAddingStep(true)}
            >
              <Icon name="plus" size={18} />
              <span>Add one small thing (optional)</span>
            </button>
          ) : (
            <form className="capsule-form" onSubmit={handleStepSubmit}>
              <label htmlFor="new-step-input" className="sr-only">
                Add one small step for today
              </label>
              <input
                id="new-step-input"
                className="capsule-input"
                type="text"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                placeholder="One gentle intention (e.g., sip warm tea)..."
                // oxlint-disable-next-line jsx-a11y/no-autofocus -- the field appears only after the user asks to add a step
                autoFocus
              />
              <button
                type="submit"
                className="capsule-submit"
                aria-label="Save small step"
              >
                <Icon name="plus" size={18} />
              </button>
            </form>
          )}
        </section>

        <section
          id="gentle-circle-section"
          className="circle-pod frosted-section-card"
          aria-labelledby="circle-heading"
        >
          <div className="section-header-row">
            <h2 id="circle-heading" className="section-label">
              <Icon name="users" size={19} />
              <span>Gentle Circle</span>
            </h2>
            <span className="section-meta">
              {checkedInCount} checked in today
            </span>
          </div>

          <p className="circle-subcopy">
            Quietly present together. No pressure, just mutual care.
          </p>

          <ul className="circle-list">
            {restingShared && (
              <li className="member-row is-self">
                <div className={`member-avatar tone-linen`}>
                  {guestName.charAt(0)}
                </div>
                <div className="member-copy">
                  <span className="member-line">
                    <span className="member-name">You</span>
                    <span className="member-feeling is-resting">
                      <Icon name="moon" size={12} />
                      <span>Resting</span>
                    </span>
                  </span>
                  <span className="member-note">
                    Your circle knows. No replies expected.
                  </span>
                </div>
              </li>
            )}
            {CIRCLE_MEMBERS.map((person) => {
              const feeling = MOOD_OPTIONS.find((m) => m.id === person.feeling);
              const warmthSent = warmthSentTo.includes(person.name);
              return (
                <li key={person.name} className="member-row">
                  <div className={`member-avatar ${person.tone}`}>
                    {person.initial}
                  </div>
                  <div className="member-copy">
                    <span className="member-line">
                      <span className="member-name">{person.name}</span>
                      {feeling ? (
                        <span
                          className={`member-feeling feeling-${feeling.id.toLowerCase()}`}
                        >
                          <Icon name={feeling.icon} size={12} />
                          <span>Feeling {feeling.label.toLowerCase()}</span>
                        </span>
                      ) : (
                        <span className="member-feeling is-resting">
                          <Icon name="moon" size={12} />
                          <span>Resting</span>
                        </span>
                      )}
                    </span>
                    <span className="member-note">
                      {person.note}
                      {person.when && (
                        <span className="member-when"> · {person.when}</span>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`member-warmth-btn ${warmthSent ? "is-sent" : ""}`}
                    aria-pressed={warmthSent}
                    aria-label={
                      warmthSent
                        ? `Warmth sent to ${person.name}`
                        : `Send warmth to ${person.name}`
                    }
                    onClick={() => onSendWarmth(person.name)}
                  >
                    <Icon
                      name={warmthSent ? "heartFilled" : "heart"}
                      size={17}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className={`wave-btn ${waveSent ? "is-sent" : ""}`}
            onClick={onSendWave}
          >
            <Icon name="wave" size={17} />
            <span>
              {waveSent
                ? "Gentle wave sent to everyone"
                : "Send everyone a gentle wave"}
            </span>
          </button>
        </section>
      </div>
    </main>
  );
}
