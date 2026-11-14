"use client";

import { type ReactNode, useState } from "react";
import {
  type AnchorItem,
  type PracticeModalState,
  SENSORY_STEPS,
} from "../data/sanctuaryData";
import { Icon, type IconName } from "./icons";
import type { SoundPreset } from "./soundEngine";
import { IconOrb, type Tone } from "./ui/IconOrb";
import { ScreenHero } from "./ui/ScreenHero";
import { SectionHeader } from "./ui/SectionHeader";

const SENSORY_CHANNELS = [
  "Scent · Safe Memory",
  "Tactile · Comfort",
  "Acoustic · Calm",
  "Place · Sanctuary",
];

const PHYSIOLOGICAL_SIGH: PracticeModalState = {
  mode: "breath",
  category: "Physiological Sigh",
  title: "The Double Inhale Sigh",
  description:
    "Sip air in twice through the nose to gently open the lungs, then release one long, unhurried sigh out.",
  icon: "air",
};

type AnchorCardProps = {
  icon: IconName;
  iconSize?: number;
  tone: Tone;
  tag: ReactNode;
  /** Right side of the top bar: a button or a small note. */
  aside: ReactNode;
  linen?: boolean;
  children: ReactNode;
};

/** Card with a tagged top bar, used for every anchor in the list. */
function AnchorCard({
  icon,
  iconSize = 15,
  tone,
  tag,
  aside,
  linen = false,
  children,
}: AnchorCardProps) {
  return (
    <article className={linen ? "anchor-card is-linen" : "anchor-card"}>
      <div className="anchor-meta-bar">
        <div className="anchor-tag-group">
          <span className={`anchor-mini-orb ${tone}`}>
            <Icon name={icon} size={iconSize} />
          </span>
          <span className="anchor-tag-pill">{tag}</span>
        </div>
        {aside}
      </div>
      {children}
    </article>
  );
}

type EmergencyRowProps = {
  icon: IconName;
  /** Without a title the row is a softer, single-line alternative. */
  title?: string;
  desc: string;
  action?: ReactNode;
};

function EmergencyRow({ icon, title, desc, action }: EmergencyRowProps) {
  return (
    <div
      className={title ? "emergency-row" : "emergency-row emergency-row-soft"}
    >
      <div className="emergency-row-lead">
        <Icon name={icon} size={20} />
        {title ? (
          <div>
            <p className="emergency-row-title">{title}</p>
            <p className="emergency-row-desc">{desc}</p>
          </div>
        ) : (
          <p className="emergency-row-desc flush-top">{desc}</p>
        )}
      </div>
      {action}
    </div>
  );
}

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
  const [phraseCount, setPhraseCount] = useState(4);
  const [addingAnchor, setAddingAnchor] = useState(false);
  const [anchorTitle, setAnchorTitle] = useState("");
  const [anchorCategory, setAnchorCategory] = useState(SENSORY_CHANNELS[0]);
  const [anchorDesc, setAnchorDesc] = useState("");

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
    if (!anchorTitle.trim()) return;
    const created: AnchorItem = {
      id: `custom-${Date.now()}`,
      tag: anchorCategory,
      title: anchorTitle.trim(),
      desc:
        anchorDesc.trim() ||
        "A personal sensory tether chosen to bring warmth and steadiness back into your body.",
      meta: "Personal tether",
      button: "Hold Anchor",
      icon: "spa",
      tone: "tone-moss",
      guideDesc:
        anchorDesc.trim() ||
        "Pause for three slow breaths while holding your attention gently on this anchor.",
    };
    onCreateAnchor(created);
    setAnchorTitle("");
    setAnchorDesc("");
    setAddingAnchor(false);
  }

  return (
    <main className="screen-body">
      <ScreenHero
        badge={<span className="status-dot" aria-hidden="true" />}
        badgeLabel="SOMATIC STABILIZERS"
        title="Your Anchors."
        subtitle="Familiar tethers to bring you back into your body when overwhelm strikes."
      />

      {/* 5-4-3-2-1 Sensory Reset */}
      <section className="sensory-reset-card">
        <div className="practice-top">
          <div>
            <span className="kicker-text">Quick Grounding</span>
            <h2 className="practice-title sensory-card-title">
              Sensory 5–4–3–2–1 Reset
            </h2>
          </div>
          <IconOrb icon="flower" tone="tone-moss" />
        </div>

        <p className="practice-desc flush-top">
          Shift activation away from racing thoughts into present physical
          stimuli.
        </p>

        <div className="senses-row">
          {SENSORY_STEPS.map((item, idx) => (
            <button
              key={item.sense}
              type="button"
              className="sense-pill"
              onClick={() => onOpenSensoryGuide(idx)}
            >
              <span className="sense-num">{item.count}</span>
              <span className="sense-label">{item.sense}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn-primary-pill btn-full"
          onClick={() => onOpenSensoryGuide(0)}
        >
          <Icon name="play" size={15} />
          <span>Begin Gentle Guide (90s)</span>
        </button>
      </section>

      {/* My Core Anchors */}
      <section className="section-block" aria-labelledby="core-anchors-heading">
        <SectionHeader
          id="core-anchors-heading"
          title="My Core Anchors"
          meta={`${anchors.length + 2} Active`}
        />

        {anchors.map((anchor) => {
          const isFav = favoritedIds.includes(anchor.id);
          return (
            <AnchorCard
              key={anchor.id}
              icon={anchor.icon}
              tone={anchor.tone}
              tag={anchor.tag}
              aside={
                <button
                  type="button"
                  className={`icon-action-btn ${isFav ? "is-favorited" : ""}`}
                  aria-label={
                    isFav
                      ? `Remove ${anchor.title} from favorites`
                      : `Save ${anchor.title} to favorites`
                  }
                  aria-pressed={isFav}
                  onClick={() => onToggleFavorite(anchor.id)}
                >
                  <Icon name={isFav ? "heartFilled" : "heart"} size={19} />
                </button>
              }
            >
              <div>
                <h3 className="practice-title">{anchor.title}</h3>
                <p className="practice-desc">{anchor.desc}</p>
              </div>

              <div className="anchor-divider-foot">
                <span className="section-meta">{anchor.meta}</span>
                <button
                  type="button"
                  className="btn-secondary-pill"
                  onClick={() =>
                    onOpenModal({
                      mode: "breath",
                      category: anchor.tag,
                      title: anchor.title,
                      description: anchor.guideDesc,
                      icon: anchor.icon,
                    })
                  }
                >
                  <Icon name="tap" size={16} />
                  <span>{anchor.button}</span>
                </button>
              </div>
            </AnchorCard>
          );
        })}

        {/* Personal Grounding Phrase */}
        <AnchorCard
          icon="voice"
          tone="tone-blush"
          tag={<>{guestName}’s Grounding Phrase</>}
          aside={
            <span className="section-meta">Repetition {phraseCount}/5</span>
          }
          linen
        >
          <blockquote className="phrase-blockquote">
            “This feeling is a wave. I am the shore.”
          </blockquote>

          <div className="practice-footer">
            <span className="practice-note">Tap rhythmically to ground</span>
            <div className="phrase-actions">
              <button
                type="button"
                className="round-action-btn"
                aria-label="Listen to grounding phrase"
                onClick={speakPhrase}
              >
                <Icon name="volume" size={18} />
              </button>
              <button
                type="button"
                className="round-action-btn"
                aria-label="Count one slow phrase repetition"
                onClick={() => {
                  setPhraseCount((prev) => {
                    const next = prev >= 5 ? 1 : prev + 1;
                    if (next === 5) {
                      onNotify("5 gentle repetitions completed. Stay steady.");
                    }
                    return next;
                  });
                }}
              >
                <Icon name="tap" size={18} />
              </button>
            </div>
          </div>
        </AnchorCard>

        {/* Vibroacoustic Brown Noise Anchor */}
        <AnchorCard
          icon="equalizer"
          iconSize={16}
          tone="tone-moss"
          tag="Acoustic · Frequency"
          aside={
            <span className="section-meta freq-badge">
              ● 24–30Hz Vibroacoustic
            </span>
          }
        >
          <div className="practice-footer">
            <div>
              <h3 className="practice-title">
                Deep Cat Purr &amp; Brown Noise
              </h3>
              <p className="practice-desc">
                Rhythmic low frequencies that relax the spine.
              </p>
            </div>
            <button
              type="button"
              className={`round-action-btn purr-play-btn ${
                activeSound === "purr" ? "is-active" : ""
              }`}
              aria-label={
                activeSound === "purr"
                  ? "Pause brown noise anchor"
                  : "Play brown noise anchor"
              }
              onClick={() => onSoundToggle("purr", "Vibroacoustic Brown Noise")}
            >
              <Icon
                name={activeSound === "purr" ? "pause" : "play"}
                size={18}
              />
            </button>
          </div>
        </AnchorCard>
      </section>

      {/* Emergency Tether */}
      <section className="emergency-tether-card">
        <span className="emergency-kicker">
          <Icon name="sos" size={18} />
          <span>Emergency Tether</span>
        </span>
        <h2 className="practice-title">Panic or High Distress Support</h2>
        <p className="practice-desc flush-top">
          If your nervous system is in full freeze or acute flight, these three
          actions trigger immediate biological downregulation.
        </p>

        <EmergencyRow
          icon="air"
          title="The Double Inhale Sigh"
          desc="2 quick inhales through nose, slow long sigh out."
          action={
            <button
              type="button"
              className="btn-secondary-pill"
              onClick={() => onOpenModal(PHYSIOLOGICAL_SIGH)}
            >
              Guide
            </button>
          }
        />
        <EmergencyRow
          icon="phone"
          title="Call Safe Person"
          desc="Mama (Direct bypass to speakerphone)"
          action={
            <button
              type="button"
              className="btn-secondary-pill btn-warm-connect"
              onClick={() =>
                onNotify("Ready to connect to Mama on speakerphone.")
              }
            >
              Connect
            </button>
          }
        />
        <EmergencyRow
          icon="snowflake"
          desc="Alternative: Submerge lower face into a bowl of ice-cold water for 15 seconds."
        />
      </section>

      {/* Add Sensory Anchor */}
      {!addingAnchor ? (
        <button
          type="button"
          className="dashed-add-anchor"
          onClick={() => setAddingAnchor(true)}
        >
          <Icon name="plus" size={18} />
          <span>Add a sensory anchor (scent, sound, person, place)</span>
        </button>
      ) : (
        <form className="anchor-composer" onSubmit={handleSubmitAnchor}>
          <div className="section-header-row">
            <h3 className="practice-title">New Personal Anchor</h3>
            <button
              type="button"
              className="icon-action-btn"
              aria-label="Cancel adding anchor"
              onClick={() => setAddingAnchor(false)}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <div className="composer-field">
            <label htmlFor="anchor-title">Anchor name</label>
            <input
              id="anchor-title"
              className="composer-input"
              type="text"
              value={anchorTitle}
              onChange={(e) => setAnchorTitle(e.target.value)}
              placeholder="e.g., Cedarwood oil on wrists"
              required
            />
          </div>
          <div className="composer-field">
            <label htmlFor="anchor-cat">Sensory channel</label>
            <select
              id="anchor-cat"
              className="composer-input"
              value={anchorCategory}
              onChange={(e) => setAnchorCategory(e.target.value)}
            >
              {SENSORY_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </div>
          <div className="composer-field">
            <label htmlFor="anchor-desc">Gentle note (optional)</label>
            <input
              id="anchor-desc"
              className="composer-input"
              type="text"
              value={anchorDesc}
              onChange={(e) => setAnchorDesc(e.target.value)}
              placeholder="How it helps your body settle..."
            />
          </div>
          <button type="submit" className="btn-primary-pill btn-full">
            Save to My Core Anchors
          </button>
        </form>
      )}

      {/* Gentle Reminder Footer */}
      <section className="affirmation-card is-neutral">
        <Icon name="spa" size={22} />
        <p className="affirmation-quote affirmation-quote-ink">
          “You don’t have to fix everything right now. Just feeling the ground
          beneath you is enough.”
        </p>
        <span className="section-meta">— Tyyni Somatic Practice</span>
      </section>
    </main>
  );
}
