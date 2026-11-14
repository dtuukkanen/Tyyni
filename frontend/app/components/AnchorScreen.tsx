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
    <main className="screen-body">
      {/* 1. Visual Category Navigation (Today-style pill grid) */}
      <section className="anchor-nav-card" aria-label="Anchor categories">
        <div className="anchor-nav-top">
          <h1 className="anchor-screen-title">Anchors</h1>
          <span className="duration-pill">{anchors.length + 3} tools</span>
        </div>

        <div
          className="anchor-filter-grid"
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
                className={`anchor-filter-chip ${active ? "is-active" : ""} ${
                  item.id === "sos" ? "is-sos-chip" : ""
                }`}
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
          className="frosted-panel-card section-block"
          aria-labelledby="senses-heading"
        >
          <div className="section-header-row">
            <h2 id="senses-heading" className="section-label">
              <Icon name="flower" size={16} />
              <span>5–4–3–2–1 Senses</span>
            </h2>
            <button
              type="button"
              className="compact-primary-btn"
              onClick={() => onOpenSensoryGuide(0)}
            >
              <Icon name="play" size={12} />
              <span>Start 90s</span>
            </button>
          </div>

          <div className="senses-row">
            {SENSORY_STEPS.map((item, idx) => (
              <button
                key={item.sense}
                type="button"
                className="sense-pill"
                onClick={() => onOpenSensoryGuide(idx)}
              >
                <Icon name={item.icon} size={16} className="sense-icon" />
                <span className="sense-num">{item.count}</span>
                <span className="sense-label">{item.sense}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. Audio & Grounding Phrase */}
      {showSound && (
        <section
          className="frosted-panel-card section-block"
          aria-labelledby="audio-anchors-heading"
        >
          <SectionHeader
            id="audio-anchors-heading"
            headingClassName="section-label"
            title="Audio & Phrase"
            meta="1-tap calm"
          />

          <div className="anchor-audio-tile">
            <IconOrb icon="equalizer" size={18} tone="tone-moss" />
            <div className="anchor-tile-copy">
              <div className="anchor-tile-line">
                <strong className="anchor-tile-title">
                  Purr &amp; Brown Noise
                </strong>
                <span className="anchor-mini-badge">24–30 Hz</span>
              </div>
              <span className="anchor-tile-sub">
                <span
                  className={`wave-bars ${purrPlaying ? "is-playing" : ""}`}
                  aria-hidden="true"
                >
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <span>{purrPlaying ? "Playing low hum" : "Low rumble"}</span>
              </span>
            </div>
            <button
              type="button"
              className={`btn-secondary-pill ${purrPlaying ? "is-active" : ""}`}
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

          <div className="anchor-phrase-tile">
            <div className="anchor-phrase-top">
              <span className="anchor-phrase-label">
                <Icon name="voice" size={14} />
                <span>{guestName}’s phrase</span>
              </span>
              <div
                className="phrase-dots"
                role="img"
                aria-label={`Repetition ${phraseCount} of 5`}
              >
                {Array.from({ length: 5 }, (_, idx) => (
                  <span
                    // oxlint-disable-next-line react/no-array-index-key -- fixed 5-dot counter
                    key={idx}
                    className={`phrase-dot ${idx < phraseCount ? "is-filled" : ""}`}
                  />
                ))}
              </div>
            </div>

            <blockquote className="phrase-blockquote">
              “This feeling is a wave. I am the shore.”
            </blockquote>

            <div className="phrase-pill-actions">
              <button
                type="button"
                className="btn-secondary-pill"
                onClick={speakPhrase}
              >
                <Icon name="volume" size={15} />
                <span>Listen</span>
              </button>
              <button
                type="button"
                className="btn-secondary-pill"
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
          className="frosted-panel-card section-block"
          aria-labelledby="core-anchors-heading"
        >
          <div className="section-header-row">
            <h2 id="core-anchors-heading" className="section-label">
              <span>My Anchors</span>
              <span className="status-dot" aria-hidden="true" />
            </h2>
            {!addingAnchor && (
              <button
                type="button"
                className="inline-add-pill"
                onClick={() => setAddingAnchor(true)}
              >
                <Icon name="plus" size={14} />
                <span>Add</span>
              </button>
            )}
          </div>

          <div className="anchor-compact-list">
            {orderedAnchors.map((anchor) => {
              const isFav = favoritedIds.includes(anchor.id);
              return (
                <article key={anchor.id} className="anchor-compact-card">
                  <IconOrb icon={anchor.icon} size={18} tone={anchor.tone} />
                  <div className="anchor-tile-copy">
                    <div className="anchor-tile-line">
                      <h3 className="anchor-tile-title">{anchor.title}</h3>
                      <span className="anchor-mini-badge">{anchor.meta}</span>
                    </div>
                    <p className="anchor-tile-desc">{anchor.desc}</p>
                  </div>
                  <div className="anchor-compact-actions">
                    <button
                      type="button"
                      className={`fav-mini-btn ${isFav ? "is-favorited" : ""}`}
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
                      className="btn-secondary-pill anchor-open-btn"
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
            <form className="anchor-composer" onSubmit={handleSubmitAnchor}>
              <div className="section-header-row">
                <h3 className="anchor-tile-title">New Anchor</h3>
                <button
                  type="button"
                  className="fav-mini-btn"
                  aria-label="Cancel adding anchor"
                  onClick={() => setAddingAnchor(false)}
                >
                  <Icon name="close" size={17} />
                </button>
              </div>

              <div
                className="channel-chip-row"
                role="radiogroup"
                aria-label="Anchor sense"
              >
                {CHANNEL_OPTIONS.map((ch, idx) => (
                  <button
                    key={ch.label}
                    type="button"
                    role="radio"
                    aria-checked={channelIdx === idx}
                    className={`channel-chip ${channelIdx === idx ? "is-selected" : ""}`}
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
                className="composer-input"
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
                className="composer-input"
                type="text"
                value={anchorDesc}
                onChange={(e) => setAnchorDesc(e.target.value)}
                placeholder="One-line cue (optional)"
              />

              <button type="submit" className="btn-primary-pill btn-full">
                Save Anchor
              </button>
            </form>
          )}
        </section>
      )}

      {/* 5. High Distress / SOS Fast Reset */}
      {showSos && (
        <section
          className="emergency-tether-card"
          aria-labelledby="sos-tether-heading"
        >
          <div className="section-header-row">
            <h2 id="sos-tether-heading" className="emergency-kicker">
              <Icon name="sos" size={17} />
              <span>High Distress · Fast Reset</span>
            </h2>
          </div>

          <div className="sos-tiles-stack">
            <div className="emergency-row">
              <div className="emergency-row-lead">
                <IconOrb icon="air" size={17} tone="tone-eucalyptus" />
                <div>
                  <p className="emergency-row-title">Double Inhale Sigh</p>
                  <p className="emergency-row-desc">
                    2 quick sips in, long slow sigh out
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary-pill"
                onClick={() => onOpenModal(PHYSIOLOGICAL_SIGH)}
              >
                Breathe
              </button>
            </div>

            <div className="emergency-row">
              <div className="emergency-row-lead">
                <IconOrb icon="phone" size={17} tone="tone-blush" />
                <div>
                  <p className="emergency-row-title">Call Mama</p>
                  <p className="emergency-row-desc">Direct speakerphone</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary-pill btn-warm-connect"
                onClick={() =>
                  onNotify("Ready to connect to Mama on speakerphone.")
                }
              >
                Call
              </button>
            </div>

            <div className="emergency-row">
              <div className="emergency-row-lead">
                <IconOrb icon="snowflake" size={17} tone="tone-moss" />
                <div>
                  <p className="emergency-row-title">Cold Water Reset</p>
                  <p className="emergency-row-desc">
                    Cool cheeks or wrists for 15 seconds
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary-pill"
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
