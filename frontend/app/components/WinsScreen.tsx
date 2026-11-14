"use client";

import { useState } from "react";
import { WIN_SUGGESTIONS } from "../data/sanctuaryData";
import { FlowerCompanion } from "./CompanionWorld";
import { Icon, type IconName } from "./icons";
import { CapsuleForm } from "./ui/CapsuleForm";
import { IconOrb, type Tone } from "./ui/IconOrb";
import { SectionHeader } from "./ui/SectionHeader";
import type { GrowthStage } from "./useBloomieGrowth";

type RecentWin = {
  icon: IconName;
  tone: Tone;
  title: string;
  when: string;
};

const RECENT_WINS: RecentWin[] = [
  {
    icon: "tree",
    tone: "tone-moss",
    title: "Stepped outside into cool air",
    when: "2h ago",
  },
  {
    icon: "moon",
    tone: "tone-eucalyptus",
    title: "Took a break instead of pushing through",
    when: "Morning",
  },
  {
    icon: "wave",
    tone: "tone-blush",
    title: "Sent a quick check-in to a friend",
    when: "Yesterday",
  },
];

const JAR_PEBBLE_SPOTS: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot: number;
  fill: string;
}[] = [
  { cx: 40, cy: 96, rx: 10, ry: 6.5, rot: -8, fill: "#a8ddb5" },
  { cx: 60, cy: 97, rx: 10.5, ry: 6.5, rot: 6, fill: "#f4b8b0" },
  { cx: 80, cy: 96, rx: 9.5, ry: 6.5, rot: -5, fill: "#b8dfd8" },
  { cx: 49, cy: 84, rx: 10, ry: 6.5, rot: 9, fill: "#f6dfb0" },
  { cx: 70, cy: 84, rx: 10, ry: 6.5, rot: -7, fill: "#a8ddb5" },
  { cx: 39, cy: 73, rx: 9, ry: 6, rot: 5, fill: "#b8dfd8" },
  { cx: 59, cy: 72, rx: 9.5, ry: 6, rot: -4, fill: "#f4b8b0" },
  { cx: 79, cy: 73, rx: 9, ry: 6, rot: 8, fill: "#f6dfb0" },
  { cx: 49, cy: 61, rx: 9, ry: 5.8, rot: -6, fill: "#a8ddb5" },
  { cx: 69, cy: 61, rx: 9, ry: 5.8, rot: 6, fill: "#b8dfd8" },
  { cx: 59, cy: 50, rx: 8.8, ry: 5.5, rot: -3, fill: "#f4b8b0" },
  { cx: 44, cy: 49, rx: 8, ry: 5.2, rot: 7, fill: "#f6dfb0" },
];

function SanctuaryJarIllustration({ count }: { count: number }) {
  const visibleCount = Math.min(count, JAR_PEBBLE_SPOTS.length);
  return (
    <svg
      className="sanctuary-jar-svg"
      viewBox="0 0 120 120"
      role="img"
      aria-label={`Sanctuary jar holding ${count} ${count === 1 ? "win" : "wins"}`}
    >
      {/* Soft ground shadow */}
      <ellipse cx="60" cy="111" rx="36" ry="5" fill="rgba(58, 96, 87, 0.12)" />

      {/* Cork lid */}
      <rect
        x="41"
        y="12"
        width="38"
        height="11"
        rx="4"
        fill="#d9a97c"
        stroke="#5a4236"
        strokeWidth="2"
      />

      {/* Jar neck */}
      <rect
        x="36"
        y="21"
        width="48"
        height="8"
        rx="3.5"
        fill="#eef7f2"
        stroke="#48655c"
        strokeWidth="2"
      />

      {/* Glass jar body */}
      <path
        d="M38 29 C28 34, 25 46, 25 66 L25 93 C25 103, 33 108, 44 108 L76 108 C87 108, 95 103, 95 93 L95 66 C95 46, 92 34, 82 29 Z"
        fill="rgba(255, 255, 255, 0.82)"
        stroke="#48655c"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Pebbles inside jar */}
      {JAR_PEBBLE_SPOTS.slice(0, visibleCount).map((spot, idx) => (
        <g
          // oxlint-disable-next-line react/no-array-index-key -- fixed coordinates inside SVG jar
          key={idx}
          className="jar-svg-pebble"
          transform={`translate(${spot.cx} ${spot.cy}) rotate(${spot.rot})`}
        >
          <ellipse
            cx="0"
            cy="0"
            rx={spot.rx}
            ry={spot.ry}
            fill={spot.fill}
            stroke="#48655c"
            strokeWidth="1.6"
          />
          <ellipse
            cx={-spot.rx * 0.28}
            cy={-spot.ry * 0.28}
            rx={spot.rx * 0.34}
            ry={spot.ry * 0.24}
            fill="rgba(255, 255, 255, 0.55)"
          />
        </g>
      ))}

      {/* Glass reflection highlight */}
      <path
        d="M33 42 C31 54, 31 76, 32 94"
        fill="none"
        stroke="rgba(255, 255, 255, 0.9)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type WinsScreenProps = {
  wins: string[];
  onAddWin: (label: string) => void;
  mood?: string;
  lowEnergy?: boolean;
  growthStage?: GrowthStage;
  isGrowing?: boolean;
  isSettling?: boolean;
};

export function WinsScreen({
  wins,
  onAddWin,
  mood = "Steady",
  lowEnergy = false,
  growthStage = 1,
  isGrowing = false,
  isSettling = false,
}: WinsScreenProps) {
  const [justAdded, setJustAdded] = useState<string | null>(null);

  function handleQuickTap(label: string) {
    onAddWin(label);
    setJustAdded(label);
    window.setTimeout(() => {
      setJustAdded((curr) => (curr === label ? null : curr));
    }, 900);
  }

  return (
    <main className="screen-body">
      {/* 1. Visual Sanctuary Jar + Companion Showcase */}
      <section
        className="wins-scene-card"
        aria-labelledby="sanctuary-jar-title"
      >
        <SectionHeader
          id="sanctuary-jar-title"
          headingClassName="section-label"
          title={
            <>
              <Icon name="heartFilled" size={16} />
              <span>Sanctuary Jar</span>
            </>
          }
          metaClassName="duration-pill is-moss"
          meta={`${wins.length} today`}
        />

        <div className="wins-visual-stage">
          <SanctuaryJarIllustration count={wins.length} />

          <div className="wins-companion-aside">
            <div className="wins-mini-bloomie-row">
              <FlowerCompanion
                variant="mini"
                mood={mood}
                lowEnergy={lowEnergy}
                stage={growthStage}
                isGrowing={isGrowing}
                isSettling={isSettling}
              />
              <div className="wins-companion-copy">
                <strong>Nurtures Bloomie</strong>
                <span>Every logged win waters today’s growth.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="win-pebble-list" aria-label="Wins in today’s jar">
          {wins.map((win, idx) => (
            <span
              // oxlint-disable-next-line react/no-array-index-key -- wins are plain strings and may repeat
              key={`${win}-${idx}`}
              className={`win-pebble win-variant-${idx % 4}`}
            >
              <Icon name="check" size={13} />
              <span>{win}</span>
            </span>
          ))}
        </div>
      </section>

      {/* 2. Quick Tap Grid + Custom Win Input */}
      <section
        className="section-block frosted-panel-card"
        aria-labelledby="acknowledge-win-heading"
      >
        <SectionHeader
          id="acknowledge-win-heading"
          headingClassName="section-label"
          title="Log a Win"
          meta="Tap to drop in jar"
        />

        <div className="wins-quick-grid">
          {WIN_SUGGESTIONS.map((item) => {
            const flashed = justAdded === item.label;
            return (
              <button
                key={item.label}
                type="button"
                className={`win-quick-tile ${flashed ? "is-added" : ""}`}
                onClick={() => handleQuickTap(item.label)}
              >
                <span className={`win-tile-orb ${item.tone}`}>
                  <Icon name={flashed ? "check" : item.icon} size={18} />
                </span>
                <span className="win-tile-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        <CapsuleForm
          id="custom-win-input"
          label="Add your own win"
          placeholder="Add your own win..."
          submitLabel="Add win to jar"
          submitIcon={<Icon name="plus" size={18} />}
          leading={<Icon name="heart" size={17} />}
          onSubmit={onAddWin}
        />
      </section>

      {/* 3. Compact Earlier Log */}
      <section
        className="section-block frosted-panel-card"
        aria-labelledby="recent-moments-heading"
      >
        <SectionHeader
          id="recent-moments-heading"
          headingClassName="section-label"
          title="Earlier"
          meta="Recent log"
        />

        <div className="wins-recent-list">
          {RECENT_WINS.map((item) => (
            <div key={item.title} className="win-recent-row">
              <IconOrb icon={item.icon} size={17} tone={item.tone} />
              <span className="win-recent-title">{item.title}</span>
              <span className="win-recent-when">{item.when}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
