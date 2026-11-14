"use client";

import { useState } from "react";
import { WIN_SUGGESTIONS } from "../data/sanctuaryData";
import { FlowerCompanion } from "./CompanionWorld";
import { Icon, type IconName } from "./icons";
import { CapsuleForm } from "./ui/CapsuleForm";
import { IconOrb, type Tone } from "./ui/IconOrb";
import { SectionHeader } from "./ui/SectionHeader";
import {
  cx,
  durationPill,
  panelCard,
  screenBody,
  sectionBlock,
  sectionLabel,
  TONE,
} from "./ui/styles";
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

/** Pebble colours in the jar's win list, repeating. */
const PEBBLE_TONES = [
  "bg-white/90 text-primary",
  "bg-tertiary-fixed/60 text-tertiary",
  "bg-[rgba(197,236,204,0.72)] text-on-secondary-container",
  "bg-primary-fixed text-on-primary-fixed",
];

function SanctuaryJarIllustration({ count }: { count: number }) {
  const visibleCount = Math.min(count, JAR_PEBBLE_SPOTS.length);
  return (
    <svg
      className="block size-24 shrink-0"
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
          className="animate-pebble-drop"
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
    <main className={screenBody()}>
      {/* 1. Visual Sanctuary Jar + Companion Showcase */}
      <section
        className="relative flex flex-col gap-3.5 overflow-hidden rounded-xl border border-secondary/14 bg-[linear-gradient(165deg,rgba(218,240,232,0.72)_0%,rgba(255,255,255,0.94)_55%,rgba(253,234,226,0.58)_100%)] p-4.5 shadow-ambient"
        aria-labelledby="sanctuary-jar-title"
      >
        <SectionHeader
          id="sanctuary-jar-title"
          headingClassName={sectionLabel}
          title={
            <>
              <Icon name="heartFilled" size={16} />
              <span>Sanctuary Jar</span>
            </>
          }
          metaClassName={durationPill({ moss: true })}
          meta={`${wins.length} today`}
        />

        <div className="flex items-center gap-3.5 rounded-lg border border-white/85 bg-white/72 px-3 py-2.5">
          <SanctuaryJarIllustration count={wins.length} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <FlowerCompanion
                variant="mini"
                mood={mood}
                lowEnergy={lowEnergy}
                stage={growthStage}
                isGrowing={isGrowing}
                isSettling={isSettling}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <strong className="text-[14px] font-semibold text-ink">
                  Nurtures Bloomie
                </strong>
                <span className="text-[12.5px] leading-[1.38] text-ink-soft">
                  Every logged win waters today’s growth.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex flex-wrap gap-1.75"
          aria-label="Wins in today’s jar"
        >
          {wins.map((win, idx) => (
            <span
              // oxlint-disable-next-line react/no-array-index-key -- wins are plain strings and may repeat
              key={`${win}-${idx}`}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border border-outline/14 px-3 py-1.75 text-[13px] font-medium",
                PEBBLE_TONES[idx % PEBBLE_TONES.length],
              )}
            >
              <Icon name="check" size={13} />
              <span>{win}</span>
            </span>
          ))}
        </div>
      </section>

      {/* 2. Quick Tap Grid + Custom Win Input */}
      <section
        className={cx(sectionBlock, panelCard)}
        aria-labelledby="acknowledge-win-heading"
      >
        <SectionHeader
          id="acknowledge-win-heading"
          headingClassName={sectionLabel}
          title="Log a Win"
          meta="Tap to drop in jar"
        />

        <div className="grid grid-cols-[repeat(3,1fr)] gap-2">
          {WIN_SUGGESTIONS.map((item) => {
            const flashed = justAdded === item.label;
            return (
              <button
                key={item.label}
                type="button"
                className={cx(
                  "flex min-h-19 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-[background-color,border-color,scale]",
                  flashed
                    ? "scale-98 border-secondary/35 bg-secondary-container"
                    : "border-outline/10 bg-surface-low hover:border-primary-container/25 hover:bg-surface-container",
                )}
                onClick={() => handleQuickTap(item.label)}
              >
                <span
                  className={cx(
                    "inline-flex size-8.5 items-center justify-center rounded-full",
                    TONE[item.tone],
                  )}
                >
                  <Icon name={flashed ? "check" : item.icon} size={18} />
                </span>
                <span className="text-[12px] leading-[1.25] font-semibold text-ink">
                  {item.label}
                </span>
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
        className={cx(sectionBlock, panelCard)}
        aria-labelledby="recent-moments-heading"
      >
        <SectionHeader
          id="recent-moments-heading"
          headingClassName={sectionLabel}
          title="Earlier"
          meta="Recent log"
        />

        <div className="flex flex-col gap-2">
          {RECENT_WINS.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-2.75 rounded-lg bg-surface-low px-3 py-2.5"
            >
              <IconOrb icon={item.icon} size={17} tone={item.tone} box="sm" />
              <span className="min-w-0 flex-1 text-[13.5px] leading-[1.35] font-medium text-ink">
                {item.title}
              </span>
              <span className="shrink-0 text-[12px] whitespace-nowrap text-ink-muted">
                {item.when}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
