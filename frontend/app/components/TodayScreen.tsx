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
import { SectionHeader } from "./ui/SectionHeader";
import {
  cx,
  frostedSectionCard,
  sectionBlock,
  sectionHeaderStack,
  sectionLabel,
  sectionMeta,
  screenBody,
  TONE,
  type Tone,
} from "./ui/styles";
import { useDismiss } from "./ui/useDismiss";
import { GROWTH_STAGE_NAMES, type GrowthStage } from "./useBloomieGrowth";

const NO_NUDGES: ResolvedBehavioralNudge[] = [];

/** Badge colours for a nudge's tone. */
const NUDGE_TONE: Record<ResolvedBehavioralNudge["tone"], string> = {
  moss: TONE["tone-moss"],
  eucalyptus: TONE["tone-eucalyptus"],
  blush: TONE["tone-blush"],
};

/** Feeling pill colours on a circle member's row, by mood id. */
const FEELING_TONE: Record<string, string> = {
  Steady: TONE["tone-moss"],
  Light: "bg-[#fbefc9] text-[#6b5414]",
  Tender: TONE["tone-blush"],
  Tired: TONE["tone-eucalyptus"],
};

const nudgeBadge =
  "inline-flex items-center gap-1.25 rounded-full px-2.25 py-0.75 text-[11px] font-semibold";
const nudgeGhostButton =
  "rounded-full bg-surface-container/80 px-2 py-0.75 text-[11px] font-semibold text-ink-muted transition-colors duration-160 hover:bg-surface-high hover:text-ink";
const softAddTrigger =
  "inline-flex min-h-11.5 w-full items-center justify-center gap-2 rounded-full border border-outline/16 bg-surface-low px-4.5 py-2.75 text-[14px] font-medium text-ink-soft transition-colors hover:bg-surface-container";

function restSupportButton(on = false) {
  return cx(
    "flex min-h-17.5 flex-col items-center justify-center gap-0.5 rounded-[16px] border px-1 py-2 text-center transition-colors",
    on
      ? "border-secondary/35 bg-secondary-container text-on-secondary-container"
      : "border-outline/12 bg-surface-low text-primary hover:bg-secondary-container",
  );
}

const restSupportLabel = "mt-0.5 text-[12.5px] font-semibold text-ink";
const restSupportHint = "text-[11px] text-ink-muted";

function moodIconWrap(onSelected = false) {
  return cx(
    "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
    onSelected
      ? "bg-white/65 text-on-secondary-container"
      : "bg-surface-container text-primary-container",
  );
}

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
      className="flex min-h-15.5 w-full items-center gap-3.5 rounded-lg border border-outline/10 bg-surface-lowest px-4 py-3.25 text-left shadow-pebble transition-colors hover:border-primary-container/28"
      aria-pressed={done}
      onClick={onToggle}
    >
      <span
        className={cx(
          "inline-flex size-7.5 shrink-0 items-center justify-center rounded-full transition-colors",
          done
            ? "bg-secondary text-on-secondary"
            : "bg-surface-container text-transparent",
        )}
      >
        <Icon name="check" size={16} />
      </span>
      <span
        className={cx(
          "flex-1 text-[15px] leading-[1.45] transition-colors",
          done ? "text-ink-muted line-through" : "text-ink",
        )}
      >
        {label}
      </span>
      <span className="shrink-0 text-outline opacity-72">
        {/* Inline, so the icon keeps sitting on the text baseline. */}
        <Icon name={icon} size={20} className="inline align-baseline" />
      </span>
    </button>
  );
}

/** How a circle member arrived today, or Resting when they haven't checked in. */
function FeelingBadge({ feeling }: { feeling?: MoodOption }) {
  const pill =
    "inline-flex items-center gap-1 rounded-full py-0.5 pr-2 pl-1.5 text-[11.5px] font-semibold";
  return feeling ? (
    <span
      className={cx(
        pill,
        FEELING_TONE[feeling.id] ?? "bg-surface-container text-ink-soft",
      )}
    >
      <Icon name={feeling.icon} size={12} />
      <span>Feeling {feeling.label.toLowerCase()}</span>
    </span>
  ) : (
    <span className={cx(pill, "bg-surface-container text-ink-muted")}>
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
    <li
      className={cx(
        "flex items-center gap-3 rounded-lg py-2.75 pr-2.5 pl-3",
        self
          ? "border border-dashed border-outline/30 bg-white/60"
          : "bg-surface-lowest shadow-[0_2px_8px_rgba(58,96,87,0.03)]",
      )}
    >
      <div
        className={cx(
          "flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold",
          TONE[tone],
        )}
      >
        {initial}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.75">
        <span className="flex flex-wrap items-center gap-x-1.75 gap-y-1">
          <span className="text-[14px] font-semibold text-ink">{name}</span>
          <FeelingBadge feeling={feeling} />
        </span>
        <span className="text-[13px] leading-[1.4] text-ink-soft">{note}</span>
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

  // The greeting card turns compact when it carries a nudge or rest supports.
  const compactCard = Boolean(activeNudge) || lowEnergy;
  const cardTitle = cx(
    "m-0 leading-[1.2] font-semibold tracking-[-0.02em] text-ink",
    compactCard
      ? "text-[19.5px] short:text-[18px]"
      : "text-[24px] short:text-[21px]",
  );
  const cardSubtitle = cx(
    "mb-0 max-w-[38ch] text-ink-soft",
    compactCard
      ? "mt-0 text-[12px] leading-[1.34] short:text-[11.5px]"
      : "mt-0.75 text-[13px] leading-[1.42] short:text-[12.5px]",
  );

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
    <main className={screenBody({ today: true })}>
      {/* 1. First Fold: Greeting / Optional Behavioral Nudge, Bloomie Showcase & Check-In */}
      <section className="flex min-h-[calc(100dvh-152px)] flex-col justify-between gap-2.5 short:min-h-[calc(100dvh-144px)] short:gap-1.5">
        <div className="flex flex-col gap-1.75">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/68 bg-white/78 px-3 py-1.25 text-[12px] font-semibold text-ink-soft shadow-[0_2px_10px_rgba(34,72,64,0.05)] backdrop-blur-[12px]">
              <Icon name="calendar" size={14} className="text-secondary" />
              <span>{dateLabel}</span>
            </span>
          </div>

          <div
            className={cx(
              "rounded-[20px] border border-white/70 shadow-[0_8px_24px_-6px_rgba(34,72,64,0.07)] backdrop-blur-[14px]",
              compactCard
                ? "flex flex-col gap-1 bg-white/86 px-3.5 py-2.5 short:px-3.25 short:py-2.25"
                : "bg-white/80 px-4 py-3.5 short:px-3.5 short:py-2.5",
            )}
            // Bloomie shrinks to make room for a nudge (see globals.css).
            data-nudge={compactCard || undefined}
          >
            {lowEnergy ? (
              <>
                <span className={cx(nudgeBadge, NUDGE_TONE.moss)}>
                  <Icon name="lowEnergy" size={12} />
                  <span>Low-energy mode</span>
                </span>
                <h1 className={cardTitle}>Running low is okay, {guestName}.</h1>
                <p className={cardSubtitle}>
                  Tyyni has gone quiet: fewer choices, slower motion. Pick one
                  thing, or simply rest.
                </p>
                <div className="mt-1.5 grid grid-cols-[repeat(3,1fr)] gap-1.5">
                  <button
                    type="button"
                    className={restSupportButton()}
                    onClick={onStartSlowExhale}
                  >
                    <Icon name="air" size={18} />
                    <span className={restSupportLabel}>Slow exhale</span>
                    <span className={restSupportHint}>1 minute</span>
                  </button>
                  <button
                    type="button"
                    className={restSupportButton(lowEnergySoundOn)}
                    aria-pressed={lowEnergySoundOn}
                    onClick={onToggleLowEnergySound}
                  >
                    <Icon
                      name={lowEnergySoundOn ? "pause" : "waves"}
                      size={18}
                    />
                    <span className={restSupportLabel}>Soft noise</span>
                    <span className={restSupportHint}>
                      {lowEnergySoundOn ? "Playing" : "Mutes the day"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={restSupportButton(restingShared)}
                    aria-pressed={restingShared}
                    onClick={onShareResting}
                  >
                    <Icon name={restingShared ? "check" : "users"} size={18} />
                    <span className={restSupportLabel}>
                      {restingShared ? "Circle knows" : "I’m resting"}
                    </span>
                    <span className={restSupportHint}>
                      {restingShared ? "No replies expected" : "Tell my circle"}
                    </span>
                  </button>
                </div>
              </>
            ) : activeNudge ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cx(nudgeBadge, NUDGE_TONE[activeNudge.tone])}
                  >
                    <Icon
                      name={activeNudge.tone === "blush" ? "heart" : "spa"}
                      size={12}
                    />
                    <span>{activeNudge.badgeLabel}</span>
                  </span>

                  <div className="inline-flex items-center gap-1.5">
                    {behavioralNudges.length > 1 && (
                      <button
                        type="button"
                        className={nudgeGhostButton}
                        onClick={onCycleNudge}
                        aria-label="Show next gentle suggestion"
                      >
                        {(activeNudgeIndex % behavioralNudges.length) + 1}/
                        {behavioralNudges.length} · Next
                      </button>
                    )}
                    <button
                      type="button"
                      className={nudgeGhostButton}
                      onClick={() => onDismissNudge(activeNudge)}
                      aria-label="Dismiss suggestion for now"
                    >
                      Later
                    </button>
                  </div>
                </div>

                <h1 className={cardTitle}>{activeNudge.headline}</h1>
                <p className={cardSubtitle}>{activeNudge.subtitle}</p>

                {activeNudge.reason && (
                  <p className="m-0 text-[11.5px] leading-[1.35] text-ink-muted">
                    {activeNudge.reason}
                  </p>
                )}

                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={cx(
                      "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.25 py-1.25 text-[12px] font-semibold shadow-[0_4px_12px_rgba(34,72,64,0.14)] transition-[background-color,transform] short:px-3 short:py-1",
                      activeNudge.tone === "blush"
                        ? "bg-tertiary-container text-on-tertiary"
                        : "bg-primary-container text-on-primary hover:bg-primary",
                    )}
                    onClick={() => onStartNudge(activeNudge)}
                  >
                    <Icon name={activeNudge.ctaIcon} size={15} />
                    <span>{activeNudge.ctaLabel}</span>
                  </button>

                  {activeNudge.done && (
                    <button
                      type="button"
                      className={cx(
                        "inline-flex min-h-8.5 items-center gap-1.25 rounded-full border border-secondary/28 px-3 py-1.25 text-[12px] font-semibold",
                        activeNudge.helped
                          ? "bg-secondary-container text-on-secondary-container"
                          : "bg-white/90 text-primary",
                      )}
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
                <h1 className={cardTitle}>Good morning, {guestName}.</h1>
                <p className={cardSubtitle}>
                  Take a slow breath. You don’t have to carry tomorrow today.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Open Scenic Window for Bloomie, with Status Pill Resting Below the Pot */}
        <div className="flex min-h-37.5 flex-1 flex-col items-center justify-end pb-0.5 short:min-h-28">
          <button
            type="button"
            className="inline-flex max-w-[min(100%,340px)] items-center gap-2.25 rounded-full border border-white/82 bg-white/88 py-1.75 pr-3.5 pl-2.25 text-left shadow-[0_8px_22px_-4px_rgba(34,72,64,0.12)] backdrop-blur-[14px] transition-[scale,background-color] duration-200 hover:scale-102 hover:bg-white/96"
            aria-label="Bloomie, your companion. Tap to hear from Bloomie."
            onClick={() => {
              setBloomieIndex((i) => i + 1);
              onInteractCompanion();
            }}
          >
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
              <Icon name="sprout" size={16} />
            </span>
            <span className="flex flex-col gap-0.25">
              <span className="flex items-center gap-1.5">
                <span className="text-[12.5px] font-semibold text-ink">
                  Bloomie
                </span>
                {shownSteps > 0 && !lowEnergy && (
                  <span
                    className="inline-flex items-center gap-0.75"
                    role="img"
                    aria-label={`${tended} of ${steps.length} tiny steps tended`}
                  >
                    {Array.from({ length: shownSteps }, (_, i) => (
                      <span
                        // oxlint-disable-next-line react/no-array-index-key -- fixed-length meter
                        key={i}
                        className={cx(
                          "h-2.5 w-1.75 -rotate-12 rounded-[7px_0_7px_0] transition-colors duration-260",
                          i < tended ? "bg-secondary" : "bg-outline/22",
                        )}
                      />
                    ))}
                  </span>
                )}
              </span>
              <span
                className="text-[11.5px] leading-[1.35] font-medium text-secondary italic"
                aria-live="polite"
              >
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
        <div className="relative z-5 flex flex-col gap-2">
          <section
            className="flex flex-col gap-2"
            aria-labelledby="checkin-heading"
          >
            <div className="relative flex items-center gap-1" ref={moodInfoRef}>
              <h2
                id="checkin-heading"
                className={cx(
                  sectionLabel,
                  "[text-shadow:0_1px_8px_rgba(255,255,255,0.78)]",
                )}
              >
                How are you arriving today?
              </h2>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-full bg-white/70 text-primary backdrop-blur-[10px] transition-colors hover:bg-white aria-expanded:bg-white"
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
                  className="absolute inset-x-0 bottom-[calc(100%+8px)] z-20 animate-popover rounded-[20px] border border-white/80 bg-white/97 p-3.5 shadow-[0_16px_40px_-8px_rgba(34,72,64,0.22)] backdrop-blur-[16px]"
                  role="dialog"
                  aria-label="What the feelings mean"
                >
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {MOOD_OPTIONS.map((option) => (
                      <li
                        key={option.id}
                        className="flex items-start gap-2.5 text-[13px] leading-[1.42] text-ink-soft"
                      >
                        <span className={moodIconWrap()}>
                          <Icon name={option.icon} size={14} />
                        </span>
                        <span>
                          <strong className="font-semibold text-ink">
                            {option.label}
                          </strong>{" "}
                          · {option.meaning}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 mb-0 border-t border-outline/12 pt-2.5 text-[12px] leading-[1.4] text-ink-muted">
                    There’s no wrong answer. It helps Tyyni and Bloomie meet you
                    where you are.
                  </p>
                </div>
              )}
            </div>

            <div
              className="grid grid-cols-[repeat(4,1fr)] gap-2 max-[374px]:grid-cols-[repeat(2,1fr)]"
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
                    className={cx(
                      "inline-flex min-h-11.5 items-center justify-center gap-1.5 rounded-full border px-1.5 py-1.75 text-[13px] backdrop-blur-[12px] transition-colors short:min-h-10 short:py-1.25",
                      isSelected
                        ? "border-secondary/35 bg-secondary-container font-semibold text-on-secondary-container shadow-[0_6px_16px_rgba(67,102,77,0.14)]"
                        : "border-outline/16 bg-surface-lowest font-medium text-ink shadow-[0_2px_8px_rgba(58,96,87,0.04)] hover:bg-surface-low",
                    )}
                    onClick={() => onSelectMood(option.id)}
                  >
                    <span className={moodIconWrap(isSelected)}>
                      <Icon name={option.icon} size={15} />
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="flex justify-center">
            <a
              href="#today-steps"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/85 px-3.25 py-1.25 text-[11.5px] font-semibold text-ink-soft no-underline shadow-[0_4px_12px_rgba(34,72,64,0.06)] backdrop-blur-[12px] transition-[background-color,translate] hover:translate-y-px hover:bg-white"
            >
              <span>Scroll for today’s gentle steps</span>
              <Icon
                name="arrowDown"
                size={14}
                className="animate-arrow-bounce text-primary"
              />
            </a>
          </div>
        </div>
      </section>

      {/* 2. Scrolled Content Section: Frosted Glass Sanctuary Cards */}
      <div
        id="today-steps"
        className="mt-11 flex scroll-mt-19 flex-col gap-5 pt-2"
      >
        <section
          className={cx(sectionBlock, frostedSectionCard)}
          aria-labelledby="tiny-steps-heading"
        >
          <div className={sectionHeaderStack}>
            <h2 id="tiny-steps-heading" className={sectionLabel}>
              <span>
                {lowEnergy ? "Just the Basics" : "Tiny Steps for Today"}
              </span>
            </h2>
            <span className={sectionMeta}>
              {lowEnergy
                ? "Basic needs first. Everything else can wait."
                : "No streaks · No penalties"}
            </span>
          </div>

          {/* Live mini Bloomie, visible while checking steps off */}
          <div className="mb-3 flex items-center gap-3 rounded-md bg-primary-fixed/32 py-1.5 pr-3.5 pl-1">
            <FlowerCompanion
              variant="mini"
              mood={mood}
              lowEnergy={lowEnergy}
              stage={growthStage}
              isGrowing={isGrowing}
              isSettling={isSettling}
            />
            <div className="flex min-w-0 flex-col gap-0.5" aria-live="polite">
              <strong className="text-[14px] font-semibold text-ink">
                Bloomie is{" "}
                {isResting
                  ? "resting"
                  : GROWTH_STAGE_NAMES[growthStage].toLowerCase()}
              </strong>
              <span className="text-[12.5px] text-secondary">{growthLine}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
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
              className={softAddTrigger}
              onClick={onExitLowEnergy}
            >
              <span>I have a bit more energy: show my usual steps</span>
            </button>
          ) : !addingStep ? (
            <button
              type="button"
              className={softAddTrigger}
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
          className={cx(
            sectionBlock,
            "rounded-xl border border-outline/10 bg-surface-low px-4.5 py-5 shadow-[0_14px_34px_-8px_rgba(34,72,64,0.1)] backdrop-blur-[16px]",
          )}
          aria-labelledby="circle-heading"
        >
          <SectionHeader
            id="circle-heading"
            headingClassName={sectionLabel}
            title={
              <>
                <Icon name="users" size={19} />
                <span>Gentle Circle</span>
              </>
            }
            meta={`${checkedInCount} checked in today`}
          />

          <p className="m-0 text-[14px] leading-[1.5] text-ink-soft">
            Quietly present together. No pressure, just mutual care.
          </p>

          <ul className="m-0 flex list-none flex-col gap-2 p-0">
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
                        <span className="text-[11.5px] text-ink-muted">
                          {" "}
                          · {person.when}
                        </span>
                      )}
                    </>
                  }
                  action={
                    <button
                      type="button"
                      className={cx(
                        "inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] hover:bg-tertiary-fixed",
                        warmthSent
                          ? "animate-warmth-pop text-[#c4626a]"
                          : "text-ink-muted hover:text-on-tertiary-fixed",
                      )}
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
            className={cx(
              "inline-flex min-h-11 items-center gap-2 self-center rounded-full border border-outline/16 px-4.5 py-2 text-[13.5px] font-semibold shadow-[0_2px_8px_rgba(58,96,87,0.05)] transition-colors",
              waveSent
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface-lowest text-primary hover:bg-primary-fixed",
            )}
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
