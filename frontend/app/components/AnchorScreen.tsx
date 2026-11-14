"use client";

import { useState } from "react";
import {
  type AnchorItem,
  type PracticeModalState,
  SENSORY_STEPS,
} from "../data/sanctuaryData";
import { Icon } from "./icons";
import type { SoundPreset } from "./soundEngine";

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
  const [anchorCategory, setAnchorCategory] = useState("Scent · Safe Memory");
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
      <div className="hero-header">
        <span className="eyebrow-badge">
          <span className="status-dot" aria-hidden="true" />
          <span>SOMATIC STABILIZERS</span>
        </span>
        <h1 className="hero-title">Your Anchors.</h1>
        <p className="hero-subtitle">
          Familiar tethers to bring you back into your body when overwhelm
          strikes.
        </p>
      </div>

      {/* 5-4-3-2-1 Sensory Reset */}
      <section className="sensory-reset-card">
        <div className="practice-top">
          <div>
            <span className="kicker-text">Quick Grounding</span>
            <h2 className="practice-title sensory-card-title">
              Sensory 5–4–3–2–1 Reset
            </h2>
          </div>
          <span className="icon-orb icon-orb-round tone-moss">
            <Icon name="flower" size={20} />
          </span>
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
        <div className="section-header-row">
          <h2 id="core-anchors-heading" className="section-heading">
            My Core Anchors
          </h2>
          <span className="section-meta">{anchors.length + 2} Active</span>
        </div>

        {anchors.map((anchor) => {
          const isFav = favoritedIds.includes(anchor.id);
          return (
            <article key={anchor.id} className="anchor-card">
              <div className="anchor-meta-bar">
                <div className="anchor-tag-group">
                  <span className={`anchor-mini-orb ${anchor.tone}`}>
                    <Icon name={anchor.icon} size={15} />
                  </span>
                  <span className="anchor-tag-pill">{anchor.tag}</span>
                </div>
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
              </div>

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
            </article>
          );
        })}

        {/* Personal Grounding Phrase */}
        <article className="anchor-card is-linen">
          <div className="anchor-meta-bar">
            <div className="anchor-tag-group">
              <span className="anchor-mini-orb tone-blush">
                <Icon name="voice" size={15} />
              </span>
              <span className="anchor-tag-pill">
                {guestName}’s Grounding Phrase
              </span>
            </div>
            <span className="section-meta">Repetition {phraseCount}/5</span>
          </div>

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
        </article>

        {/* Vibroacoustic Brown Noise Anchor */}
        <article className="anchor-card">
          <div className="anchor-meta-bar">
            <div className="anchor-tag-group">
              <span className="anchor-mini-orb tone-moss">
                <Icon name="equalizer" size={16} />
              </span>
              <span className="anchor-tag-pill">Acoustic · Frequency</span>
            </div>
            <span className="section-meta freq-badge">
              ● 24–30Hz Vibroacoustic
            </span>
          </div>

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
        </article>
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

        <div className="emergency-row">
          <div className="emergency-row-lead">
            <Icon name="air" size={20} />
            <div>
              <p className="emergency-row-title">The Double Inhale Sigh</p>
              <p className="emergency-row-desc">
                2 quick inhales through nose, slow long sigh out.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary-pill"
            onClick={() =>
              onOpenModal({
                mode: "breath",
                category: "Physiological Sigh",
                title: "The Double Inhale Sigh",
                description:
                  "Sip air in twice through the nose to gently open the lungs, then release one long, unhurried sigh out.",
                icon: "air",
              })
            }
          >
            Guide
          </button>
        </div>

        <div className="emergency-row">
          <div className="emergency-row-lead">
            <Icon name="phone" size={20} />
            <div>
              <p className="emergency-row-title">Call Safe Person</p>
              <p className="emergency-row-desc">
                Mama (Direct bypass to speakerphone)
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary-pill btn-warm-connect"
            onClick={() =>
              onNotify("Ready to connect to Mama on speakerphone.")
            }
          >
            Connect
          </button>
        </div>

        <div className="emergency-row emergency-row-soft">
          <div className="emergency-row-lead">
            <Icon name="snowflake" size={20} />
            <p className="emergency-row-desc flush-top">
              Alternative: Submerge lower face into a bowl of ice-cold water for
              15 seconds.
            </p>
          </div>
        </div>
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
              <option value="Scent · Safe Memory">Scent · Safe Memory</option>
              <option value="Tactile · Comfort">Tactile · Comfort</option>
              <option value="Acoustic · Calm">Acoustic · Calm</option>
              <option value="Place · Sanctuary">Place · Sanctuary</option>
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
