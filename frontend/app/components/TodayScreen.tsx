"use client";

import { useState } from "react";
import {
  CIRCLE_MEMBERS,
  MOOD_OPTIONS,
  STEP_ICONS,
} from "../data/sanctuaryData";
import { Icon } from "./icons";

type TodayScreenProps = {
  guestName: string;
  dateLabel: string;
  lowEnergy: boolean;
  onExitLowEnergy: () => void;
  mood: string;
  onSelectMood: (moodId: string) => void;
  steps: string[];
  checked: number[];
  onToggleStep: (index: number) => void;
  onAddStep: (label: string) => void;
  waveSent: boolean;
  onSendWave: () => void;
  onInteractCompanion: () => void;
};

export function TodayScreen({
  guestName,
  dateLabel,
  lowEnergy,
  onExitLowEnergy,
  mood,
  onSelectMood,
  steps,
  checked,
  onToggleStep,
  onAddStep,
  waveSent,
  onSendWave,
  onInteractCompanion,
}: TodayScreenProps) {
  const [addingStep, setAddingStep] = useState(false);
  const [newStep, setNewStep] = useState("");

  const selectedMood =
    MOOD_OPTIONS.find((m) => m.id === mood) ?? MOOD_OPTIONS[2];
  const visibleSteps = lowEnergy ? steps.slice(0, 1) : steps;

  const companionSubtitle = lowEnergy
    ? "Resting quietly with you · Soft sanctuary"
    : mood === "Tired"
      ? "Keeping gentle watch · Rest-ready"
      : mood === "Tender"
        ? "Holding soft space · Gently rooted"
        : mood === "Light"
          ? "Basking in warm breeze · Radiating calm"
          : "Nurtured by your presence · Thriving & Calmed";

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
      {/* 1. First Fold: Greeting, Unobstructed Animated Flower Showcase & Somatic Check-In */}
      <section className="today-hero-fold">
        <div className="today-hero-top">
          <div className="top-meta-row">
            <span className="date-pill date-pill-frosted">
              <Icon name="calendar" size={14} />
              <span>{dateLabel}</span>
            </span>
          </div>

          <div className="hero-greeting-card">
            <h1 className="hero-title">Good morning, {guestName}.</h1>
            <p className="hero-subtitle">
              Take a slow breath. You don’t have to carry tomorrow today.
            </p>
          </div>

          {lowEnergy && (
            <div className="low-energy-banner" role="status">
              <Icon name="spa" size={20} />
              <div>
                <strong>Low-energy sanctuary is active</strong>
                Everything extra has stepped aside. Focusing on one gentle step
                — or resting completely — is enough.
              </div>
            </div>
          )}
        </div>

        {/* Open Scenic Window for Bloomie, with Status Pill Resting Below the Pot */}
        <div className="companion-stage-window">
          <button
            type="button"
            className="companion-status-pill"
            onClick={onInteractCompanion}
          >
            <span className="companion-status-orb">
              <Icon name="spa" size={16} />
            </span>
            <span className="companion-status-copy">
              <span className="companion-status-title-row">
                <span className="companion-status-title">
                  {guestName}’s Companion: Bloomie
                </span>
                <span className="companion-pulse-dot" aria-hidden="true" />
              </span>
              <span className="companion-status-sub">{companionSubtitle}</span>
            </span>
          </button>
        </div>

        {/* Bottom of Hero Fold: Somatic Arrival Check-In & Scroll Cue */}
        <div className="today-checkin-dock">
          <section className="section-block" aria-labelledby="checkin-heading">
            <div className="section-header-row">
              <h2
                id="checkin-heading"
                className="section-label checkin-frosted-heading"
              >
                How are you arriving today?
              </h2>
              <span className="mood-selected-badge">
                {selectedMood.label} selected
              </span>
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

            <p
              className="mood-response mood-response-frosted"
              aria-live="polite"
            >
              <Icon name="checkCircle" size={16} />
              <span>{selectedMood.response}</span>
            </p>
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
          <div className="section-header-row">
            <h2 id="tiny-steps-heading" className="section-label">
              <span>Tiny Steps for Today</span>
              <span className="status-dot" aria-hidden="true" />
            </h2>
            <span className="section-meta">No streaks · No penalties</span>
          </div>

          <div className="steps-stack">
            {visibleSteps.map((step, index) => {
              const isDone = checked.includes(index);
              const iconName = STEP_ICONS[index % STEP_ICONS.length];
              return (
                <button
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

          {lowEnergy && steps.length > 1 && (
            <button
              type="button"
              className="soft-add-trigger"
              onClick={onExitLowEnergy}
            >
              <span>Show {steps.length - 1} more optional steps</span>
            </button>
          )}

          {!addingStep ? (
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
          className="circle-pod frosted-section-card"
          aria-labelledby="circle-heading"
        >
          <div className="section-header-row">
            <h2 id="circle-heading" className="section-label">
              <Icon name="users" size={19} />
              <span>Gentle Circle</span>
            </h2>
            <span className="section-meta">3 checked in today</span>
          </div>

          <p className="circle-subcopy">
            Quietly present together. No pressure, just mutual care.
          </p>

          <div className="circle-grid">
            {CIRCLE_MEMBERS.map((person) => (
              <div key={person.name} className="member-card">
                <div className="member-avatar-wrap">
                  <div className={`member-avatar ${person.tone}`}>
                    {person.initial}
                  </div>
                  {person.done && (
                    <span className="member-badge" aria-hidden="true">
                      <Icon name="check" size={11} />
                    </span>
                  )}
                </div>
                <span className="member-name">{person.name}</span>
                <span
                  className={`member-status ${person.done ? "is-done" : ""}`}
                >
                  {person.done && <Icon name="checkCircle" size={12} />}
                  <span>{person.status}</span>
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={`wave-btn ${waveSent ? "is-sent" : ""}`}
            onClick={onSendWave}
          >
            <Icon name="wave" size={17} />
            <span>{waveSent ? "Gentle wave sent" : "Send a gentle wave"}</span>
          </button>
        </section>
      </div>
    </main>
  );
}
