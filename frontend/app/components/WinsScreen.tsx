"use client";

import { useState } from "react";
import { WIN_SUGGESTIONS } from "../data/sanctuaryData";
import { Icon } from "./icons";

type WinsScreenProps = {
  wins: string[];
  onAddWin: (label: string) => void;
};

export function WinsScreen({ wins, onAddWin }: WinsScreenProps) {
  const [winInput, setWinInput] = useState("");

  function handleWinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!winInput.trim()) return;
    onAddWin(winInput);
    setWinInput("");
  }

  return (
    <main className="screen-body">
      <div className="hero-header">
        <span className="eyebrow-badge">
          <Icon name="heartFilled" size={13} />
          <span>MICRO-VICTORIES</span>
        </span>
        <h1 className="hero-title hero-title-green">Gentle Wins.</h1>
        <p className="hero-subtitle">
          Nothing is too small. Surviving a hard moment, resting, or drinking
          water is already a triumph.
        </p>

        <div className="reassure-banner">
          <span className="icon-orb icon-orb-round tone-moss">
            <Icon name="tree" size={20} />
          </span>
          <div className="reassure-copy">
            <strong>No scoreboards here</strong>
            <span>
              Wins are not tallied for productivity, but gathered gently as soft
              proof of kindness to yourself.
            </span>
          </div>
        </div>
      </div>

      {/* Sanctuary Jar */}
      <section className="jar-card" aria-labelledby="sanctuary-jar-title">
        <div className="jar-glow-warm" aria-hidden="true" />
        <div className="jar-glow-moss" aria-hidden="true" />
        <div className="jar-content">
          <div className="section-header-row">
            <h2 id="sanctuary-jar-title" className="section-label">
              <span className="status-dot" aria-hidden="true" />
              <span>Today’s Sanctuary Jar</span>
            </h2>
            <span className="duration-pill">
              {wins.length} quiet {wins.length === 1 ? "win" : "wins"} today
            </span>
          </div>

          <div className="win-pebble-list">
            {wins.map((win, idx) => (
              <span
                // oxlint-disable-next-line react/no-array-index-key -- wins are plain strings and may repeat
                key={`${win}-${idx}`}
                className={`win-pebble win-variant-${idx % 4}`}
              >
                <span className="win-pebble-dot" aria-hidden="true" />
                <span>{win}</span>
              </span>
            ))}
          </div>

          <p className="jar-whisper">
            <Icon name="sun" size={16} />
            <span>Each one is a tiny breath of courage.</span>
          </p>
        </div>
      </section>

      {/* Acknowledge a Win */}
      <section
        className="section-block"
        aria-labelledby="acknowledge-win-heading"
      >
        <div className="section-header-row">
          <h2
            id="acknowledge-win-heading"
            className="section-heading section-heading-green"
          >
            Acknowledge a Win
          </h2>
          <span className="section-meta">Tap to place in jar</span>
        </div>

        <div className="suggestion-chips">
          {WIN_SUGGESTIONS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="suggestion-chip"
              onClick={() => onAddWin(item.label)}
            >
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <form className="capsule-form" onSubmit={handleWinSubmit}>
          <Icon name="heart" size={18} />
          <label htmlFor="custom-win-input" className="sr-only">
            Write your own quiet win
          </label>
          <input
            id="custom-win-input"
            className="capsule-input"
            type="text"
            value={winInput}
            onChange={(e) => setWinInput(e.target.value)}
            placeholder="Write your own quiet win..."
          />
          <button
            type="submit"
            className="capsule-submit"
            aria-label="Place quiet win in jar"
          >
            <Icon name="spa" size={17} />
          </button>
        </form>
      </section>

      {/* Recent Gentle Moments */}
      <section
        className="section-block"
        aria-labelledby="recent-moments-heading"
      >
        <div className="section-header-row">
          <h2
            id="recent-moments-heading"
            className="section-heading section-heading-green"
          >
            Recent Gentle Moments
          </h2>
          <span className="section-meta">Safe Haven</span>
        </div>

        <div className="moments-group">
          <span className="moments-day-label">
            <span className="status-dot" aria-hidden="true" />
            <span>Earlier Today</span>
          </span>

          <article className="moment-card">
            <span className="icon-orb icon-orb-round tone-moss">
              <Icon name="tree" size={18} />
            </span>
            <div className="moment-body">
              <div className="moment-top">
                <span className="moment-title">
                  Stepped outside into the cool air
                </span>
                <span className="moment-time">2 hrs ago</span>
              </div>
              <div className="moment-tags">
                <span className="moment-tag-pill tone-moss">
                  Somatic release
                </span>
                <span aria-hidden="true">•</span>
                <span>Felt shoulders relax</span>
              </div>
            </div>
          </article>

          <article className="moment-card">
            <span className="icon-orb icon-orb-round tone-blush">
              <Icon name="heartFilled" size={17} />
            </span>
            <div className="moment-body">
              <div className="moment-top">
                <span className="moment-title">
                  Chose to rest instead of pushing through
                </span>
                <span className="moment-time">Morning</span>
              </div>
              <div className="moment-tags">
                <span className="moment-tag-pill tone-blush">
                  Self-compassion
                </span>
                <span aria-hidden="true">•</span>
                <span>Nervous system honor</span>
              </div>
            </div>
          </article>
        </div>

        <div className="moments-group">
          <span className="moments-day-label">
            <span className="status-dot status-dot-muted" aria-hidden="true" />
            <span>Yesterday</span>
          </span>

          <article className="moment-card">
            <span className="icon-orb icon-orb-round tone-linen">
              <Icon name="spa" size={18} />
            </span>
            <div className="moment-body">
              <div className="moment-top">
                <span className="moment-title">
                  Sent a gentle message to my friend
                </span>
                <span className="moment-time">Yesterday</span>
              </div>
              <div className="moment-tags">
                <span className="moment-tag-pill tone-linen">
                  Gentle circle
                </span>
                <span aria-hidden="true">•</span>
                <span>No pressure conversation</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="affirmation-card" aria-label="Gentle reflection">
        <span className="icon-orb icon-orb-round affirmation-orb">
          <Icon name="meditate" size={20} />
        </span>
        <p className="affirmation-quote">
          “You do not need to earn your rest.”
        </p>
        <p className="affirmation-sub">
          Return to these soft reflections whenever overwhelm strikes. You are
          doing enough simply by breathing.
        </p>
      </section>
    </main>
  );
}
