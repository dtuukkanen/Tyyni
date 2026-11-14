"use client";

import { WIN_SUGGESTIONS } from "../data/sanctuaryData";
import { Icon, type IconName } from "./icons";
import { CapsuleForm } from "./ui/CapsuleForm";
import { IconOrb, type Tone } from "./ui/IconOrb";
import { ReassureBanner } from "./ui/ReassureBanner";
import { ScreenHero } from "./ui/ScreenHero";
import { SectionHeader } from "./ui/SectionHeader";

type Moment = {
  icon: IconName;
  iconSize: number;
  tone: Tone;
  title: string;
  time: string;
  tag: string;
  note: string;
};

/** Sample history shown under Recent Gentle Moments, grouped by day. */
const MOMENT_DAYS: { label: string; muted: boolean; moments: Moment[] }[] = [
  {
    label: "Earlier Today",
    muted: false,
    moments: [
      {
        icon: "tree",
        iconSize: 18,
        tone: "tone-moss",
        title: "Stepped outside into the cool air",
        time: "2 hrs ago",
        tag: "Somatic release",
        note: "Felt shoulders relax",
      },
      {
        icon: "heartFilled",
        iconSize: 17,
        tone: "tone-blush",
        title: "Chose to rest instead of pushing through",
        time: "Morning",
        tag: "Self-compassion",
        note: "Nervous system honor",
      },
    ],
  },
  {
    label: "Yesterday",
    muted: true,
    moments: [
      {
        icon: "spa",
        iconSize: 18,
        tone: "tone-linen",
        title: "Sent a gentle message to my friend",
        time: "Yesterday",
        tag: "Gentle circle",
        note: "No pressure conversation",
      },
    ],
  },
];

function MomentCard({ icon, iconSize, tone, title, time, tag, note }: Moment) {
  return (
    <article className="moment-card">
      <IconOrb icon={icon} size={iconSize} tone={tone} />
      <div className="moment-body">
        <div className="moment-top">
          <span className="moment-title">{title}</span>
          <span className="moment-time">{time}</span>
        </div>
        <div className="moment-tags">
          <span className={`moment-tag-pill ${tone}`}>{tag}</span>
          <span aria-hidden="true">•</span>
          <span>{note}</span>
        </div>
      </div>
    </article>
  );
}

type WinsScreenProps = {
  wins: string[];
  onAddWin: (label: string) => void;
};

export function WinsScreen({ wins, onAddWin }: WinsScreenProps) {
  return (
    <main className="screen-body">
      <ScreenHero
        badge={<Icon name="heartFilled" size={13} />}
        badgeLabel="MICRO-VICTORIES"
        title="Gentle Wins."
        subtitle="Nothing is too small. Surviving a hard moment, resting, or drinking water is already a triumph."
        green
      >
        <ReassureBanner
          icon="tree"
          tone="tone-moss"
          title="No scoreboards here"
        >
          Wins are not tallied for productivity, but gathered gently as soft
          proof of kindness to yourself.
        </ReassureBanner>
      </ScreenHero>

      {/* Sanctuary Jar */}
      <section className="jar-card" aria-labelledby="sanctuary-jar-title">
        <div className="jar-glow-warm" aria-hidden="true" />
        <div className="jar-glow-moss" aria-hidden="true" />
        <div className="jar-content">
          <SectionHeader
            id="sanctuary-jar-title"
            headingClassName="section-label"
            title={
              <>
                <span className="status-dot" aria-hidden="true" />
                <span>Today’s Sanctuary Jar</span>
              </>
            }
            metaClassName="duration-pill"
            meta={`${wins.length} quiet ${wins.length === 1 ? "win" : "wins"} today`}
          />

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
        <SectionHeader
          id="acknowledge-win-heading"
          headingClassName="section-heading section-heading-green"
          title="Acknowledge a Win"
          meta="Tap to place in jar"
        />

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

        <CapsuleForm
          id="custom-win-input"
          label="Write your own quiet win"
          placeholder="Write your own quiet win..."
          submitLabel="Place quiet win in jar"
          submitIcon={<Icon name="spa" size={17} />}
          leading={<Icon name="heart" size={18} />}
          onSubmit={onAddWin}
        />
      </section>

      {/* Recent Gentle Moments */}
      <section
        className="section-block"
        aria-labelledby="recent-moments-heading"
      >
        <SectionHeader
          id="recent-moments-heading"
          headingClassName="section-heading section-heading-green"
          title="Recent Gentle Moments"
          meta="Safe Haven"
        />

        {MOMENT_DAYS.map((day) => (
          <div key={day.label} className="moments-group">
            <span className="moments-day-label">
              <span
                className={
                  day.muted ? "status-dot status-dot-muted" : "status-dot"
                }
                aria-hidden="true"
              />
              <span>{day.label}</span>
            </span>

            {day.moments.map((moment) => (
              <MomentCard key={moment.title} {...moment} />
            ))}
          </div>
        ))}
      </section>

      <section className="affirmation-card" aria-label="Gentle reflection">
        <IconOrb icon="meditate" className="affirmation-orb" />
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
