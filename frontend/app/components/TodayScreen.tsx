"use client";

import { type ReactNode, useRef, useState } from "react";
import type { ResolvedBehavioralNudge } from "../data/behavioralNudges";
import {
  CIRCLE_MEMBERS,
  LOW_ENERGY_STEPS,
  MOOD_OPTIONS,
  type MoodOption,
  STEP_ICONS,
} from "../data/sanctuaryData";
import { FlowerCompanion } from "./CompanionWorld";
import { Icon, type IconName } from "./icons";
import { CapsuleForm } from "./ui/CapsuleForm";
import type { Tone } from "./ui/IconOrb";
import { SectionHeader } from "./ui/SectionHeader";
import { useDismiss } from "./ui/useDismiss";
import { GROWTH_STAGE_NAMES, type GrowthStage } from "./useBloomieGrowth";

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
  stage: GrowthStage,
) {
  const pool =
    BLOOMIE_LINES[lowEnergy ? "lowEnergy" : mood] ?? BLOOMIE_LINES.Steady;
  // Bloomie speaks to its growth first: thirsty, then tended steps, then bloom.
  const first =
    lowEnergy || stage === 1
      ? tended > 0 && !lowEnergy
        ? `${tended} tiny step${tended === 1 ? "" : "s"} tended. I can feel it in my roots.`
        : null
      : stage === 0
        ? "I’m a little thirsty. One tiny step would perk me up."
        : "Everything’s tended. I’m in full bloom!";
  const lines = first ? [first, ...pool] : pool;
  return lines[index % lines.length];
}

type StepCardProps = {
  icon: IconName;
  label: string;
  done: boolean;
  onToggle: () => void;
};

function StepCard({ icon, label, done, onToggle }: StepCardProps) {
  return (
    <button
      type="button"
      className={`step-card ${done ? "is-done" : ""}`}
      aria-pressed={done}
      onClick={onToggle}
    >
      <span className="step-check">
        <Icon name="check" size={16} />
      </span>
      <span className="step-text">{label}</span>
      <span className="step-trailing-icon">
        <Icon name={icon} size={20} />
      </span>
    </button>
  );
}

/** How a circle member arrived today, or Resting when they haven't checked in. */
function FeelingBadge({ feeling }: { feeling?: MoodOption }) {
  return feeling ? (
    <span className={`member-feeling feeling-${feeling.id.toLowerCase()}`}>
      <Icon name={feeling.icon} size={12} />
      <span>Feeling {feeling.label.toLowerCase()}</span>
    </span>
  ) : (
    <span className="member-feeling is-resting">
      <Icon name="moon" size={12} />
      <span>Resting</span>
    </span>
  );
}

type MemberRowProps = {
  initial: string;
  tone: Tone;
  name: string;
  feeling?: MoodOption;
  note: ReactNode;
  /** The user's own row. */
  self?: boolean;
  action?: ReactNode;
};

function MemberRow({
  initial,
  tone,
  name,
  feeling,
  note,
  self = false,
  action,
}: MemberRowProps) {
  return (
    <li className={self ? "member-row is-self" : "member-row"}>
      <div className={`member-avatar ${tone}`}>{initial}</div>
      <div className="member-copy">
        <span className="member-line">
          <span className="member-name">{name}</span>
          <FeelingBadge feeling={feeling} />
        </span>
        <span className="member-note">{note}</span>
      </div>
      {action}
    </li>
  );
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
  growthStage: GrowthStage;
  growthDone: number;
  growthTotal: number;
  /** A state picked in settings is showing instead of the live one. */
  growthPreview: boolean;
  isGrowing: boolean;
  isSettling: boolean;
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
  growthStage,
  growthDone,
  growthTotal,
  growthPreview,
  isGrowing,
  isSettling,
  warmthSentTo,
  onSendWarmth,
  onInteractCompanion,
}: TodayScreenProps) {
  const [addingStep, setAddingStep] = useState(false);
  const [bloomieIndex, setBloomieIndex] = useState(0);
  const [moodInfoOpen, setMoodInfoOpen] = useState(false);
  const moodInfoRef = useRef<HTMLDivElement>(null);

  useDismiss(moodInfoOpen, () => setMoodInfoOpen(false), moodInfoRef);

  const tended = checked.filter((i) => i < steps.length).length;
  const shownSteps = Math.min(steps.length, 5);
  const checkedInCount = CIRCLE_MEMBERS.filter((p) => p.feeling).length;

  const activeNudge =
    behavioralNudges.length > 0
      ? behavioralNudges[activeNudgeIndex % behavioralNudges.length]
      : null;

  const isResting = lowEnergy && growthDone === 0 && !growthPreview;
  const growthLine = growthPreview
    ? "Previewing from settings · pick Live to use your steps."
    : isResting
      ? "Resting with you · nothing needs to grow today."
      : growthStage === 0
        ? "Check off a tiny step to perk Bloomie up."
        : growthStage === 1
          ? `${growthDone} of ${growthTotal} done · every bit helps.`
          : "Everything’s done — enjoy the bloom.";

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
                “
                {bloomieLine(
                  mood,
                  lowEnergy,
                  tended,
                  bloomieIndex,
                  growthStage,
                )}
                ”
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
            </h2>
            <span className="section-meta">
              {lowEnergy
                ? "Basic needs first. Everything else can wait."
                : "No streaks · No penalties"}
            </span>
          </div>

          {/* Live mini Bloomie, visible while checking steps off */}
          <div className="bloomie-steps-strip">
            <FlowerCompanion
              variant="mini"
              mood={mood}
              lowEnergy={lowEnergy}
              stage={growthStage}
              isGrowing={isGrowing}
              isSettling={isSettling}
            />
            <div className="bloomie-steps-copy" aria-live="polite">
              <strong>
                Bloomie is{" "}
                {isResting
                  ? "resting"
                  : GROWTH_STAGE_NAMES[growthStage].toLowerCase()}
              </strong>
              <span>{growthLine}</span>
            </div>
          </div>

          <div className="steps-stack">
            {lowEnergy
              ? LOW_ENERGY_STEPS.map((step, index) => (
                  <StepCard
                    key={step.label}
                    icon={step.icon}
                    label={step.label}
                    done={restChecked.includes(index)}
                    onToggle={() => onToggleRestStep(index)}
                  />
                ))
              : steps.map((step, index) => (
                  <StepCard
                    // oxlint-disable-next-line react/no-array-index-key -- steps are plain strings and may repeat
                    key={`${step}-${index}`}
                    icon={STEP_ICONS[index % STEP_ICONS.length]}
                    label={step}
                    done={checked.includes(index)}
                    onToggle={() => onToggleStep(index)}
                  />
                ))}
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
            <CapsuleForm
              id="new-step-input"
              label="Add one small step for today"
              placeholder="One gentle intention (e.g., sip warm tea)..."
              submitLabel="Save small step"
              submitIcon={<Icon name="plus" size={18} />}
              focusOnOpen
              onSubmit={(text) => {
                onAddStep(text);
                setAddingStep(false);
              }}
            />
          )}
        </section>

        <section
          id="gentle-circle-section"
          className="circle-pod frosted-section-card"
          aria-labelledby="circle-heading"
        >
          <SectionHeader
            id="circle-heading"
            headingClassName="section-label"
            title={
              <>
                <Icon name="users" size={19} />
                <span>Gentle Circle</span>
              </>
            }
            meta={`${checkedInCount} checked in today`}
          />

          <p className="circle-subcopy">
            Quietly present together. No pressure, just mutual care.
          </p>

          <ul className="circle-list">
            {restingShared && (
              <MemberRow
                self
                initial={guestName.charAt(0)}
                tone="tone-linen"
                name="You"
                note="Your circle knows. No replies expected."
              />
            )}
            {CIRCLE_MEMBERS.map((person) => {
              const warmthSent = warmthSentTo.includes(person.name);
              return (
                <MemberRow
                  key={person.name}
                  initial={person.initial}
                  tone={person.tone}
                  name={person.name}
                  feeling={MOOD_OPTIONS.find((m) => m.id === person.feeling)}
                  note={
                    <>
                      {person.note}
                      {person.when && (
                        <span className="member-when"> · {person.when}</span>
                      )}
                    </>
                  }
                  action={
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
                  }
                />
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
