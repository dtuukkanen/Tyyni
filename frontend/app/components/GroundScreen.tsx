"use client";

import type { ReactNode } from "react";
import type { PracticeModalState } from "../data/sanctuaryData";
import { Icon, type IconName } from "./icons";
import type { SoundPreset } from "./soundEngine";
import { IconOrb, type Tone } from "./ui/IconOrb";
import { ReassureBanner } from "./ui/ReassureBanner";
import { ScreenHero } from "./ui/ScreenHero";
import {
  durationPill,
  pillButton,
  practiceDesc,
  practiceNote,
  practiceTitle,
  screenBody,
  sectionBlock,
  statusDot,
} from "./ui/styles";
import { WaveBars } from "./ui/WaveBars";

type GroundScreenProps = {
  activeSound: SoundPreset | null;
  onSoundToggle: (preset: SoundPreset, label: string) => void;
  onOpenModal: (modal: PracticeModalState) => void;
};

type PracticeCardProps = {
  icon: IconName;
  tone: Tone;
  title: string;
  desc: ReactNode;
  duration: string;
  /** Green duration pill. */
  durationMoss?: boolean;
  /** Small line in the footer, left of the action. */
  note: ReactNode;
  /** Footer button. */
  action: ReactNode;
  /** Content between the header and the footer. */
  children?: ReactNode;
};

function PracticeCard({
  icon,
  tone,
  title,
  desc,
  duration,
  durationMoss = false,
  note,
  action,
  children,
}: PracticeCardProps) {
  return (
    <article className="flex flex-col gap-3.5 rounded-lg border border-outline/10 bg-surface-lowest p-4.5 shadow-pebble">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <IconOrb icon={icon} size={22} tone={tone} square />
          <div>
            <h2 className={practiceTitle}>{title}</h2>
            <p className={practiceDesc}>{desc}</p>
          </div>
        </div>
        <span className={durationPill({ moss: durationMoss })}>{duration}</span>
      </div>
      {children}
      <div className="flex items-center justify-between gap-3">
        <span className={practiceNote}>{note}</span>
        {action}
      </div>
    </article>
  );
}

/** A practice whose button opens the breathing guide. */
type GuidedPractice = Omit<PracticeCardProps, "action" | "children"> & {
  cta: string;
  primary?: boolean;
  modal: PracticeModalState;
};

const BOX_BREATHING: GuidedPractice = {
  icon: "air",
  tone: "tone-moss",
  title: "Box Breathing",
  desc: "Calm nervous system · Inhale, hold, exhale, rest",
  duration: "2 mins",
  note: (
    <>
      <Icon name="infinity" size={16} />
      <span>Biomorphic balance</span>
    </>
  ),
  cta: "Begin",
  primary: true,
  modal: {
    mode: "breath",
    category: "Breath Rhythm",
    title: "Box Breathing",
    description:
      "Follow the soothing expansion. There is no right or wrong rhythm.",
    icon: "air",
  },
};

/** The body-based practices, shown after Nearby nature. */
const BODY_PRACTICES: GuidedPractice[] = [
  {
    icon: "meditate",
    tone: "tone-eucalyptus",
    title: "Gentle Body Scan",
    desc: "Unclench jaw, soften shoulders, release hands",
    duration: "3 mins",
    note: (
      <>
        <span className={statusDot()} aria-hidden="true" />
        <span>Seated or lying down</span>
      </>
    ),
    cta: "Begin",
    primary: true,
    modal: {
      mode: "guide",
      category: "Body Scan · 3 Min",
      title: "Gentle Body Softening",
      description: "Tap each area as you let the tension drop away.",
      icon: "meditate",
      durationSeconds: 180,
      steps: [
        {
          title: "Jaw & Forehead",
          detail: "Rest your tongue away from the roof of your mouth.",
          icon: "spa",
        },
        {
          title: "Shoulders & Chest",
          detail: "Let both shoulders drop an inch away from your ears.",
          icon: "stone",
        },
        {
          title: "Hands & Feet",
          detail:
            "Unclench your fingers and feel the floor or bed beneath you.",
          icon: "meditate",
        },
      ],
    },
  },
  {
    icon: "bed",
    tone: "tone-blush",
    title: "Gentle Mat Stretch",
    desc: "Bed or soft rug · Child’s pose & resting twist",
    duration: "5 mins",
    note: "Zero sweat · Heavy pillows encouraged",
    cta: "View Poses",
    modal: {
      mode: "guide",
      category: "Restorative Poses · 5 Min",
      title: "Gentle Mat Stretch",
      description: "Stay in each pose as long as it feels comfortable.",
      icon: "bed",
      durationSeconds: 300,
      steps: [
        {
          title: "Supported Child’s Pose",
          detail: "Knees wide, fold forward with a pillow under your chest.",
          icon: "bed",
        },
        {
          title: "Side-Lying Twist",
          detail: "Lie on your side with a cushion tucked between your knees.",
          icon: "moon",
        },
        {
          title: "Legs Rested Up",
          detail:
            "Rest calves on the bed or couch edge to ease your lower back.",
          icon: "stone",
        },
      ],
    },
  },
  {
    icon: "walk",
    tone: "tone-moss",
    title: "Mindful Slow Walk",
    desc: "Just feeling your feet contact the floor",
    duration: "10 mins",
    note: "Indoor socks or outdoor stroll",
    cta: "Begin",
    modal: {
      mode: "guide",
      category: "Movement · 10 Min",
      title: "Slow Grounding Walk",
      description: "Walk without a destination — indoors or outside.",
      icon: "walk",
      durationSeconds: 600,
      steps: [
        {
          title: "Heel, Sole, Lift",
          detail: "Feel each foot meet the ground before shifting weight.",
          icon: "walk",
        },
        {
          title: "Look Ahead",
          detail: "Lift your gaze from screens toward trees, roofs, or sky.",
          icon: "eye",
        },
        {
          title: "Three Quiet Sounds",
          detail: "Notice footsteps, wind, or distant birds along the way.",
          icon: "waves",
        },
      ],
    },
  },
];

const NEARBY_NATURE_MODAL: PracticeModalState = {
  mode: "guide",
  category: "Nearby Green Space · 0.8 km",
  title: "Linden Grove & Lakeside",
  description: "A level, shaded loop with benches facing the water.",
  icon: "forest",
  steps: [
    {
      title: "Shaded Gravel Path",
      detail: "8-minute level walk beneath mature linden trees.",
      icon: "forest",
    },
    {
      title: "West-Facing Benches",
      detail: "Quiet spots along the water with low foot traffic.",
      icon: "pin",
    },
    {
      title: "Open Lawn",
      detail: "Soft grass clearing near the south entrance.",
      icon: "sun",
    },
  ],
};

const SOS_MODAL: PracticeModalState = {
  mode: "breath",
  category: "Emergency Calm",
  title: "Deep Calming Sigh",
  description:
    "Two short sips of air in through your nose, then one long sigh out.",
  icon: "heartFilled",
  phases: [
    { label: "Sip in", cue: "Through the nose", expand: true, ms: 2000 },
    { label: "Top-up sip", cue: "One quick sip more", expand: true, ms: 1300 },
    {
      label: "Long sigh",
      cue: "Slow release out the mouth",
      expand: false,
      ms: 6000,
    },
    { label: "Rest", cue: "Let shoulders drop", expand: false, ms: 2000 },
  ],
};

export function GroundScreen({
  activeSound,
  onSoundToggle,
  onOpenModal,
}: GroundScreenProps) {
  const sanctuaryPlaying = activeSound === "sanctuary";

  function guided({ cta, primary, modal, ...card }: GuidedPractice) {
    return (
      <PracticeCard
        key={card.title}
        {...card}
        action={
          <button
            type="button"
            className={pillButton({
              variant: primary ? "primary" : "secondary",
            })}
            onClick={() => onOpenModal(modal)}
          >
            {cta}
          </button>
        }
      />
    );
  }

  return (
    <main className={screenBody()}>
      <ScreenHero
        badge={<Icon name="spa" size={14} />}
        badgeLabel="SOMATIC ANCHOR"
        title="Ground yourself."
        subtitle="Choose one gentle practice. No rush, no expectations."
      >
        <ReassureBanner
          icon="twilight"
          tone="tone-eucalyptus"
          title="Your pace is worthy"
        >
          Even closing your eyes for 30 seconds rewires the nervous system.
        </ReassureBanner>
      </ScreenHero>

      <section
        className="flex flex-col gap-3.5"
        aria-label="Grounding practices"
      >
        {guided(BOX_BREATHING)}

        <PracticeCard
          icon="waves"
          tone="tone-linen"
          title="Sound Sanctuary"
          desc="Ambient rainfall, forest stream, singing bowl"
          duration="5 mins"
          note={
            <>
              <WaveBars playing={sanctuaryPlaying} />
              <span>Warm acoustic hum</span>
            </>
          }
          action={
            <button
              type="button"
              className={pillButton({ active: sanctuaryPlaying })}
              onClick={() => onSoundToggle("sanctuary", "Sound Sanctuary")}
            >
              <Icon name={sanctuaryPlaying ? "pause" : "play"} size={15} />
              <span>{sanctuaryPlaying ? "Playing" : "Listen"}</span>
            </button>
          }
        />

        <PracticeCard
          icon="forest"
          tone="tone-moss"
          title="Nearby nature"
          desc="Quiet shaded trees, lake shores, riverbank, or open grass"
          duration="0.8 km"
          durationMoss
          note="Open benches · Low foot traffic · Calming water"
          action={
            <button
              type="button"
              className={pillButton()}
              onClick={() => onOpenModal(NEARBY_NATURE_MODAL)}
            >
              Explore
            </button>
          }
        >
          <div className="relative h-27 overflow-hidden rounded-md border border-secondary/16 bg-[#dceee4]">
            <svg
              className="block size-full"
              viewBox="0 0 360 110"
              preserveAspectRatio="xMidYMid slice"
              role="img"
              aria-label="Illustration of Linden Grove and Lakeside Haven path"
            >
              <rect width="360" height="110" fill="#d9eee2" />
              <path
                d="M0 78 C68 58, 125 90, 198 68 C260 49, 312 65, 360 48 L360 110 L0 110 Z"
                fill="#b8dec9"
              />
              <path
                d="M210 0 C235 34, 275 46, 360 40 L360 0 Z"
                fill="#bce0ea"
              />
              <path
                d="M24 96 Q 112 46, 198 62 T 334 26"
                fill="none"
                stroke="#fbf9f6"
                strokeWidth="3.5"
                strokeDasharray="6 5"
                strokeLinecap="round"
              />
              <circle cx="76" cy="42" r="14" fill="#9ccfB0" />
              <circle cx="96" cy="36" r="11" fill="#88c29f" />
              <circle cx="156" cy="32" r="15" fill="#9ccfB0" />
              <circle cx="198" cy="62" r="7" fill="#3a6057" />
              <circle
                cx="198"
                cy="62"
                r="13"
                fill="#3a6057"
                fillOpacity="0.22"
              />
            </svg>
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-[linear-gradient(to_top,rgba(24,42,36,0.76),rgba(24,42,36,0.28)_68%,transparent)] px-3 py-2.5 text-[12.5px] font-medium text-white">
              <Icon name="pin" size={15} />
              <span>Linden Grove &amp; Lakeside Haven (8 min gentle walk)</span>
            </div>
          </div>
        </PracticeCard>

        {BODY_PRACTICES.map(guided)}
      </section>

      <div className={sectionBlock}>
        <div className="flex items-center gap-3 rounded-lg bg-surface-low p-4 text-[13.5px] leading-[1.5] text-ink-soft">
          <Icon name="verified" size={20} />
          <span>
            Doing even{" "}
            <strong className="font-semibold text-ink">30 seconds</strong>{" "}
            counts as a full practice. Showing up for your breath is already
            enough.
          </span>
        </div>

        <button
          type="button"
          className="inline-flex min-h-13.5 w-full items-center justify-center gap-2.25 rounded-full bg-tertiary-fixed px-4.5 py-3.5 text-[14.5px] font-semibold text-on-tertiary-fixed transition-colors hover:bg-tertiary-fixed-dim"
          onClick={() => onOpenModal(SOS_MODAL)}
        >
          <Icon name="sos" size={20} />
          <span>Need immediate calm? 1-Tap SOS Breathing</span>
        </button>
      </div>
    </main>
  );
}
