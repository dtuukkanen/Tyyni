"use client";

import { useState } from "react";
import {
  type AnchorItem,
  type PracticeModalState,
  SENSORY_STEPS,
} from "../data/sanctuaryData";
import { Icon, type IconName } from "./icons";
import type { SoundPreset } from "./soundEngine";
import { IconOrb } from "./ui/IconOrb";
import { SectionHeader } from "./ui/SectionHeader";
import {
  cx,
  durationPill,
  panelCard,
  pillButton,
  screenBody,
  sectionBlock,
  sectionHeaderRow,
  sectionLabel,
  statusDot,
} from "./ui/styles";
import { WaveBars } from "./ui/WaveBars";

const tileTitle = "m-0 text-[14.5px] font-semibold text-ink";
const tileCopy = "flex min-w-0 flex-1 flex-col gap-0.75";
const tileLine = "flex flex-wrap items-center gap-1.5";
const miniBadge =
  "rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-ink-soft";
const composerInput =
  "min-h-10.5 rounded-md border border-outline/16 bg-surface-lowest px-3.25 py-2.25 text-[14px] text-ink";
const emergencyRow =
  "flex items-center justify-between gap-2.5 rounded-lg bg-white/88 px-3 py-2.75";
const emergencyRowLead = "flex min-w-0 items-center gap-2.5";
const emergencyRowTitle = "m-0 text-[14px] font-semibold text-ink";
const emergencyRowDesc =
  "mt-0.25 mb-0 text-[12px] leading-[1.35] text-ink-soft";

function favButton(favorited = false) {
  return cx(
    "inline-flex size-9 items-center justify-center rounded-full transition-colors duration-160 hover:bg-surface-container",
    favorited ? "text-tertiary-container" : "text-outline hover:text-primary",
  );
}

type AnchorFilter = "all" | "senses" | "sound" | "sos";

const FILTER_TABS: { id: AnchorFilter; label: string; icon: IconName }[] = [
  { id: "all", label: "All", icon: "anchor" },
  { id: "senses", label: "Senses", icon: "eye" },
  { id: "sound", label: "Audio", icon: "waves" },
  { id: "sos", label: "SOS", icon: "sos" },
];

const CHANNEL_OPTIONS: {
  label: string;
  icon: IconName;
  tone: "tone-moss" | "tone-eucalyptus" | "tone-blush";
}[] = [
  { label: "Touch", icon: "tap", tone: "tone-moss" },
  { label: "Scent", icon: "flower", tone: "tone-blush" },
  { label: "Sound", icon: "waves", tone: "tone-eucalyptus" },
  { label: "Place", icon: "tree", tone: "tone-moss" },
];

const PHYSIOLOGICAL_SIGH: PracticeModalState = {
  mode: "breath",
  category: "Fast Reset · 1 Min",
  title: "Double Inhale Sigh",
  description:
    "Two quick sips of air in through your nose, then one long, slow sigh out.",
  icon: "air",
  phases: [
    { label: "Sip in", cue: "Through the nose", expand: true, ms: 2000 },
    { label: "Top-up sip", cue: "One quick sip more", expand: true, ms: 1300 },
    {
      label: "Long sigh",
      cue: "Slow release out the mouth",
      expand: false,
      ms: 6000,
    },
    { label: "Rest", cue: "Shoulders drop", expand: false, ms: 2000 },
  ],
};

const COLD_WATER_MODAL: PracticeModalState = {
  mode: "guide",
  category: "Dive Reflex · 15 Sec",
  title: "Cold Water Reset",
  description:
    "Cold water on cheeks or wrists slows heart rate within seconds.",
  icon: "snowflake",
  durationSeconds: 15,
  steps: [
    {
      title: "Fill bowl or cup hands",
      detail: "Use cold tap water or hold a cool wet cloth.",
      icon: "droplet",
    },
    {
      title: "Cool cheeks & eyes",
      detail: "Press cold water to cheeks and forehead for 15 seconds.",
      icon: "snowflake",
    },
  ],
};

type AnchorScreenProps = {
  guestName: string;
  anchors: AnchorItem[];
  favoritedIds: string[];
  onToggleFavorite: (anchorId: string) => void;
  onCreateAnchor: (anchor: AnchorItem) => void;
  activeSound: SoundPreset | null;
  onSoundToggle: (preset: SoundPreset, label: string) => void;
  onOpenSensoryGuide: (startIndex: number) => void;
  onOpenModal: (modal: PracticeModalState) => void;
  onNotify: (message: string) => void;
};

export function AnchorScreen({
  guestName,
  anchors,
  favoritedIds,
  onToggleFavorite,
  onCreateAnchor,
  activeSound,
  onSoundToggle,
  onOpenSensoryGuide,
  onOpenModal,
  onNotify,
}: AnchorScreenProps) {
  const [filter, setFilter] = useState<AnchorFilter>("all");
  const [phraseCount, setPhraseCount] = useState(4);
  const [addingAnchor, setAddingAnchor] = useState(false);
  const [anchorTitle, setAnchorTitle] = useState("");
  const [channelIdx, setChannelIdx] = useState(0);
  const [anchorDesc, setAnchorDesc] = useState("");

  const purrPlaying = activeSound === "purr";
  const showSenses = filter === "all" || filter === "senses";
  const showSound = filter === "all" || filter === "sound";
  const showSaved = filter === "all" || filter === "senses";
  const showSos = filter === "all" || filter === "sos";

  function speakPhrase() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(
        "This feeling is a wave. I am the shore.",
      );
      utter.rate = 0.82;
      utter.pitch = 0.95;
      window.speechSynthesis.speak(utter);
    }
    onNotify("“This feeling is a wave. I am the shore.”");
  }

  function handleSubmitAnchor(e: React.FormEvent) {
    e.preventDefault();
    const title = anchorTitle.trim();
    if (!title) return;
    const channel = CHANNEL_OPTIONS[channelIdx] ?? CHANNEL_OPTIONS[0];
    const detail =
      anchorDesc.trim() || "Hold your attention gently on this familiar cue.";
    const created: AnchorItem = {
      id: `custom-${Date.now()}`,
      tag: channel.label,
      title,
      desc: detail,
      meta: "Personal",
      button: "Open",
      icon: channel.icon,
      tone: channel.tone,
      guideDesc: detail,
      guideSteps: [
        {
          title: "Bring it close",
          detail,
          icon: channel.icon,
        },
        {
          title: "Notice one detail",
          detail: "Focus on its temperature, texture, scent, or sound.",
          icon: "eye",
        },
      ],
    };
    onCreateAnchor(created);
    setAnchorTitle("");
    setAnchorDesc("");
    setAddingAnchor(false);
  }

  // Show favorited anchors first for faster scanning.
  const orderedAnchors = [
    ...anchors.filter((a) => favoritedIds.includes(a.id)),
    ...anchors.filter((a) => !favoritedIds.includes(a.id)),
  ];

  return (
    <main className={screenBody()}>
      {/* 1. Visual Category Navigation (Today-style pill grid) */}
      <section
        className="flex flex-col gap-3 rounded-xl border border-primary-container/14 bg-[linear-gradient(165deg,rgba(218,240,232,0.72)_0%,rgba(255,255,255,0.96)_100%)] px-4.5 py-4 shadow-ambient"
        aria-label="Anchor categories"
      >
        <div className="flex items-center justify-between gap-2.5">
          <h1 className="m-0 text-[23px] font-[650] tracking-[-0.02em] text-ink">
            Anchors
          </h1>
          <span className={durationPill()}>{anchors.length + 3} tools</span>
        </div>

        <div
          className="grid grid-cols-[repeat(4,1fr)] gap-1.5"
          role="tablist"
          aria-label="Filter anchors"
        >
          {FILTER_TABS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={cx(
                  "inline-flex min-h-10 items-center justify-center gap-1.25 rounded-full border px-2 py-1.5 text-[12.5px] font-semibold transition-colors duration-160",
                  !active &&
                    "border-outline/14 bg-white/85 text-ink-soft hover:bg-surface-container hover:text-ink",
                  active &&
                    (item.id === "sos"
                      ? "border-tertiary bg-tertiary-container text-on-tertiary"
                      : "border-primary bg-primary-container text-on-primary"),
                )}
                onClick={() => setFilter(item.id)}
              >
                <Icon name={item.icon} size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. 5-4-3-2-1 Senses Strip */}
      {showSenses && (
        <section
          className={cx(panelCard, sectionBlock)}
          aria-labelledby="senses-heading"
        >
          <div className={sectionHeaderRow}>
            <h2 id="senses-heading" className={sectionLabel}>
              <Icon name="flower" size={16} />
              <span>5–4–3–2–1 Senses</span>
            </h2>
            <button
              type="button"
              className="inline-flex min-h-8.5 items-center gap-1.5 rounded-full bg-primary-container px-3.25 py-1.5 text-[12.5px] font-semibold text-on-primary transition-colors hover:bg-primary"
              onClick={() => onOpenSensoryGuide(0)}
            >
              <Icon name="play" size={12} />
              <span>Start 90s</span>
            </button>
          </div>

          <div className="grid grid-cols-[repeat(5,1fr)] gap-1.5 rounded-lg bg-surface-low p-1.5">
            {SENSORY_STEPS.map((item, idx) => (
              <button
                key={item.sense}
                type="button"
                className="flex min-h-17 flex-col items-center justify-center gap-0.5 rounded-md bg-surface-lowest px-1 py-2 transition-colors hover:bg-primary-fixed"
                onClick={() => onOpenSensoryGuide(idx)}
              >
                <Icon
                  name={item.icon}
                  size={16}
                  className="text-primary-container"
                />
                <span className="text-[14px] leading-[1.1] font-bold text-primary">
                  {item.count}
                </span>
                <span className="text-[11px] font-medium text-ink-soft">
                  {item.sense}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. Audio & Grounding Phrase */}
      {showSound && (
        <section
          className={cx(panelCard, sectionBlock)}
          aria-labelledby="audio-anchors-heading"
        >
          <SectionHeader
            id="audio-anchors-heading"
            headingClassName={sectionLabel}
            title="Audio & Phrase"
            meta="1-tap calm"
          />

          <div className="flex items-center gap-3 rounded-lg bg-surface-low p-3">
            <IconOrb icon="equalizer" size={18} tone="tone-moss" box="md" />
            <div className={tileCopy}>
              <div className={tileLine}>
                <strong className={tileTitle}>Purr &amp; Brown Noise</strong>
                <span className={miniBadge}>24–30 Hz</span>
              </div>
              <span className="inline-flex items-center gap-1.75 text-[12.5px] text-ink-soft">
                <WaveBars playing={purrPlaying} />
                <span>{purrPlaying ? "Playing low hum" : "Low rumble"}</span>
              </span>
            </div>
            <button
              type="button"
              className={pillButton({ active: purrPlaying })}
              aria-label={
                purrPlaying
                  ? "Pause brown noise anchor"
                  : "Play brown noise anchor"
              }
              onClick={() => onSoundToggle("purr", "Vibroacoustic Brown Noise")}
            >
              <Icon name={purrPlaying ? "pause" : "play"} size={14} />
              <span>{purrPlaying ? "Pause" : "Play"}</span>
            </button>
          </div>

          <div className="flex flex-col gap-2.5 rounded-lg bg-surface-low p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.25 text-[12px] font-semibold text-ink-soft">
                <Icon name="voice" size={14} />
                <span>{guestName}’s phrase</span>
              </span>
              <div
                className="inline-flex items-center gap-1.25"
                role="img"
                aria-label={`Repetition ${phraseCount} of 5`}
              >
                {Array.from({ length: 5 }, (_, idx) => (
                  <span
                    // oxlint-disable-next-line react/no-array-index-key -- fixed 5-dot counter
                    key={idx}
                    className={cx(
                      "size-2 rounded-full transition-[background-color,scale]",
                      idx < phraseCount
                        ? "scale-112 bg-primary-container"
                        : "bg-outline/25",
                    )}
                  />
                ))}
              </div>
            </div>

            <blockquote className="m-0 border-l-3 border-primary-container/45 pl-3 text-[16.5px] leading-[1.38] font-medium text-primary italic">
              “This feeling is a wave. I am the shore.”
            </blockquote>

            <div className="grid grid-cols-[repeat(2,1fr)] gap-2">
              <button
                type="button"
                className={pillButton({ variant: "outline", size: "tile" })}
                onClick={speakPhrase}
              >
                <Icon name="volume" size={15} />
                <span>Listen</span>
              </button>
              <button
                type="button"
                className={pillButton({ variant: "outline", size: "tile" })}
                onClick={() => {
                  setPhraseCount((prev) => {
                    const next = prev >= 5 ? 1 : prev + 1;
                    if (next === 5) {
                      onNotify("5 repetitions complete.");
                    }
                    return next;
                  });
                }}
              >
                <Icon name="tap" size={15} />
                <span>Tap ({phraseCount}/5)</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 4. Personal Tactile Anchors */}
      {showSaved && (
        <section
          className={cx(panelCard, sectionBlock)}
          aria-labelledby="core-anchors-heading"
        >
          <div className={sectionHeaderRow}>
            <h2 id="core-anchors-heading" className={sectionLabel}>
              <span>My Anchors</span>
              <span className={statusDot()} aria-hidden="true" />
            </h2>
            {!addingAnchor && (
              <button
                type="button"
                className="inline-flex min-h-8 items-center gap-1.25 rounded-full border border-outline/16 bg-surface-low px-2.75 py-1.25 text-[12.5px] font-semibold text-primary transition-colors duration-160 hover:bg-primary-fixed"
                onClick={() => setAddingAnchor(true)}
              >
                <Icon name="plus" size={14} />
                <span>Add</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {orderedAnchors.map((anchor) => {
              const isFav = favoritedIds.includes(anchor.id);
              return (
                <article
                  key={anchor.id}
                  className="flex items-center gap-2.75 rounded-lg bg-surface-low p-3"
                >
                  <IconOrb
                    icon={anchor.icon}
                    size={18}
                    tone={anchor.tone}
                    box="md"
                  />
                  <div className={tileCopy}>
                    <div className={tileLine}>
                      <h3 className={tileTitle}>{anchor.title}</h3>
                      <span className={miniBadge}>{anchor.meta}</span>
                    </div>
                    <p className="m-0 text-[12.5px] leading-[1.38] text-ink-soft">
                      {anchor.desc}
                    </p>
                  </div>
                  <div className="inline-flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className={favButton(isFav)}
                      aria-label={
                        isFav
                          ? `Remove ${anchor.title} from favorites`
                          : `Pin ${anchor.title} to top`
                      }
                      aria-pressed={isFav}
                      onClick={() => onToggleFavorite(anchor.id)}
                    >
                      <Icon name={isFav ? "heartFilled" : "heart"} size={16} />
                    </button>
                    <button
                      type="button"
                      className={pillButton({ variant: "outline", size: "sm" })}
                      onClick={() =>
                        onOpenModal({
                          mode: "guide",
                          category: `${anchor.tag} · ${anchor.meta}`,
                          title: anchor.title,
                          description: anchor.guideDesc,
                          icon: anchor.icon,
                          durationSeconds: anchor.durationSeconds,
                          steps: anchor.guideSteps,
                        })
                      }
                    >
                      {anchor.button}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {addingAnchor && (
            <form
              className="flex flex-col gap-2.5 rounded-lg border border-primary-container/22 bg-surface-low p-3.5"
              onSubmit={handleSubmitAnchor}
            >
              <div className={sectionHeaderRow}>
                <h3 className={tileTitle}>New Anchor</h3>
                <button
                  type="button"
                  className={favButton()}
                  aria-label="Cancel adding anchor"
                  onClick={() => setAddingAnchor(false)}
                >
                  <Icon name="close" size={17} />
                </button>
              </div>

              <div
                className="grid grid-cols-[repeat(4,1fr)] gap-1.5"
                role="radiogroup"
                aria-label="Anchor sense"
              >
                {CHANNEL_OPTIONS.map((ch, idx) => (
                  <button
                    key={ch.label}
                    type="button"
                    role="radio"
                    aria-checked={channelIdx === idx}
                    className={cx(
                      "inline-flex min-h-9 items-center justify-center gap-1 rounded-full border px-1.5 py-1.25 text-[12px] font-semibold",
                      channelIdx === idx
                        ? "border-primary bg-primary-container text-on-primary"
                        : "border-outline/16 bg-surface-lowest text-ink-soft",
                    )}
                    onClick={() => setChannelIdx(idx)}
                  >
                    <Icon name={ch.icon} size={14} />
                    <span>{ch.label}</span>
                  </button>
                ))}
              </div>

              <label htmlFor="anchor-title" className="sr-only">
                Anchor name
              </label>
              <input
                id="anchor-title"
                className={composerInput}
                type="text"
                value={anchorTitle}
                onChange={(e) => setAnchorTitle(e.target.value)}
                placeholder="Name (e.g., Cedarwood oil on wrists)"
                required
              />

              <label htmlFor="anchor-desc" className="sr-only">
                Short cue (optional)
              </label>
              <input
                id="anchor-desc"
                className={composerInput}
                type="text"
                value={anchorDesc}
                onChange={(e) => setAnchorDesc(e.target.value)}
                placeholder="One-line cue (optional)"
              />

              <button
                type="submit"
                className={pillButton({ variant: "primary", full: true })}
              >
                Save Anchor
              </button>
            </form>
          )}
        </section>
      )}

      {/* 5. High Distress / SOS Fast Reset */}
      {showSos && (
        <section
          className="flex flex-col gap-3 rounded-xl border border-tertiary-container/20 bg-tertiary-fixed/34 p-4.5"
          aria-labelledby="sos-tether-heading"
        >
          <div className={sectionHeaderRow}>
            <h2
              id="sos-tether-heading"
              className="m-0 inline-flex items-center gap-1.75 text-[13px] font-bold tracking-[0.03em] text-tertiary uppercase"
            >
              <Icon name="sos" size={17} />
              <span>High Distress · Fast Reset</span>
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            <div className={emergencyRow}>
              <div className={emergencyRowLead}>
                <IconOrb icon="air" size={17} tone="tone-eucalyptus" box="md" />
                <div>
                  <p className={emergencyRowTitle}>Double Inhale Sigh</p>
                  <p className={emergencyRowDesc}>
                    2 quick sips in, long slow sigh out
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={pillButton({ size: "sm" })}
                onClick={() => onOpenModal(PHYSIOLOGICAL_SIGH)}
              >
                Breathe
              </button>
            </div>

            <div className={emergencyRow}>
              <div className={emergencyRowLead}>
                <IconOrb icon="phone" size={17} tone="tone-blush" box="md" />
                <div>
                  <p className={emergencyRowTitle}>Call Mama</p>
                  <p className={emergencyRowDesc}>Direct speakerphone</p>
                </div>
              </div>
              <button
                type="button"
                className={pillButton({ variant: "warm", size: "sm" })}
                onClick={() =>
                  onNotify("Ready to connect to Mama on speakerphone.")
                }
              >
                Call
              </button>
            </div>

            <div className={emergencyRow}>
              <div className={emergencyRowLead}>
                <IconOrb icon="snowflake" size={17} tone="tone-moss" box="md" />
                <div>
                  <p className={emergencyRowTitle}>Cold Water Reset</p>
                  <p className={emergencyRowDesc}>
                    Cool cheeks or wrists for 15 seconds
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={pillButton({ size: "sm" })}
                onClick={() => onOpenModal(COLD_WATER_MODAL)}
              >
                15s Guide
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
