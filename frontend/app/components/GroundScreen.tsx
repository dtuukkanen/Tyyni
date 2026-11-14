"use client";

import type { ReactNode } from "react";
import type { PracticeModalState } from "../data/sanctuaryData";
import { Icon, type IconName } from "./icons";
import type { SoundPreset } from "./soundEngine";
import { IconOrb, type Tone } from "./ui/IconOrb";
import { ReassureBanner } from "./ui/ReassureBanner";
import { ScreenHero } from "./ui/ScreenHero";

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
  /** Extra class on the duration pill, e.g. `is-moss`. */
  durationClassName?: string;
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
  durationClassName,
  note,
  action,
  children,
}: PracticeCardProps) {
  return (
    <article className="practice-card">
      <div className="practice-top">
        <div className="practice-lead">
          <IconOrb icon={icon} size={22} tone={tone} square />
          <div>
            <h2 className="practice-title">{title}</h2>
            <p className="practice-desc">{desc}</p>
          </div>
        </div>
        <span
          className={
            durationClassName
              ? `duration-pill ${durationClassName}`
              : "duration-pill"
          }
        >
          {duration}
        </span>
      </div>
      {children}
      <div className="practice-footer">
        <span className="practice-note">{note}</span>
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
        <span className="status-dot" aria-hidden="true" />
        <span>Seated or lying down</span>
      </>
    ),
    cta: "Begin",
    primary: true,
    modal: {
      mode: "breath",
      category: "Quiet Unwinding",
      title: "Gentle Body Softening",
      description:
        "Let your tongue rest away from the roof of your mouth. Drop your shoulders down an inch.",
      icon: "meditate",
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
      mode: "breath",
      category: "Comfort First",
      title: "Restorative Mat Rest",
      description:
        "Fold over a pillow in wide-knee child’s pose, then rest on your side with knees supported.",
      icon: "bed",
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
      mode: "breath",
      category: "Tactile Presence",
      title: "Slow Grounding Walk",
      description:
        "Notice the heel touch, the roll across the sole, and the lift. There is nowhere to hurry.",
      icon: "walk",
    },
  },
];

const NEARBY_NATURE_MODAL: PracticeModalState = {
  mode: "breath",
  category: "Nature Connection",
  title: "Linden Grove Sanctuary",
  description:
    "Step outside whenever you feel ready. Watching leaves move in the wind naturally softens cortisol.",
  icon: "forest",
  tips: [
    "8 min level walk along shaded gravel",
    "Quiet lakeside benches facing west",
  ],
};

const SOS_MODAL: PracticeModalState = {
  mode: "breath",
  category: "Emergency Calm",
  title: "Deep Calming Sigh",
  description:
    "Take two soft sips of air in through your nose, followed by a long, unhurried sigh out your mouth.",
  icon: "heartFilled",
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
            className={primary ? "btn-primary-pill" : "btn-secondary-pill"}
            onClick={() => onOpenModal(modal)}
          >
            {cta}
          </button>
        }
      />
    );
  }

  return (
    <main className="screen-body">
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

      <section className="practices-stack" aria-label="Grounding practices">
        {guided(BOX_BREATHING)}

        <PracticeCard
          icon="waves"
          tone="tone-linen"
          title="Sound Sanctuary"
          desc="Ambient rainfall, forest stream, singing bowl"
          duration="5 mins"
          note={
            <>
              <span
                className={`wave-bars ${sanctuaryPlaying ? "is-playing" : ""}`}
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
              <span>Warm acoustic hum</span>
            </>
          }
          action={
            <button
              type="button"
              className={`btn-secondary-pill ${
                sanctuaryPlaying ? "is-active" : ""
              }`}
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
          durationClassName="is-moss"
          note="Open benches · Low foot traffic · Calming water"
          action={
            <button
              type="button"
              className="btn-secondary-pill"
              onClick={() => onOpenModal(NEARBY_NATURE_MODAL)}
            >
              Explore
            </button>
          }
        >
          <div className="nature-map-card">
            <svg
              className="nature-map-svg"
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
            <div className="nature-map-caption">
              <Icon name="pin" size={15} />
              <span>Linden Grove &amp; Lakeside Haven (8 min gentle walk)</span>
            </div>
          </div>
        </PracticeCard>

        {BODY_PRACTICES.map(guided)}
      </section>

      <div className="section-block">
        <div className="reassure-footnote">
          <Icon name="verified" size={20} />
          <span>
            Doing even <strong>30 seconds</strong> counts as a full practice.
            Showing up for your breath is already enough.
          </span>
        </div>

        <button
          type="button"
          className="sos-pill-btn"
          onClick={() => onOpenModal(SOS_MODAL)}
        >
          <Icon name="sos" size={20} />
          <span>Need immediate calm? 1-Tap SOS Breathing</span>
        </button>
      </div>
    </main>
  );
}
