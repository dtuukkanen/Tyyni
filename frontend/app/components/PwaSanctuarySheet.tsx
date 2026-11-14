"use client";

import {
  DEMO_NUDGE_OPTIONS,
  type DemoNudgeKey,
} from "../data/behavioralNudges";
import { Icon, TyyniLogo } from "./icons";
import { ModalSheet } from "./ui/ModalSheet";
import { cx, eyebrowBadge, pillButton, statusDot } from "./ui/styles";
import type { PwaState } from "./usePwa";
import {
  type BloomieDemo,
  GROWTH_STAGE_NAMES,
  type GrowthStage,
} from "./useBloomieGrowth";

const BLOOMIE_DEMO_OPTIONS: { key: BloomieDemo; label: string }[] = [
  { key: null, label: "Live" },
  { key: 0, label: GROWTH_STAGE_NAMES[0] },
  { key: 1, label: GROWTH_STAGE_NAMES[1] },
  { key: 2, label: GROWTH_STAGE_NAMES[2] },
  { key: "play", label: "Play all" },
];

type PreviewChipsProps<K> = {
  title: string;
  description: string;
  ariaLabel: string;
  options: readonly { key: K; label: string }[];
  selected: K;
  onSelect: (key: K) => void;
};

/** A labelled row of single-select chips for previewing demo states. */
const iosGuide =
  "flex flex-col gap-1 rounded-lg border border-primary-container/15 bg-primary-fixed/35 px-4 py-3.5 text-[13px] leading-[1.48] text-ink-soft [&_strong]:text-primary";

/** A setting's bold name and one-line explanation. */
function PrefCopy({ title, children }: { title: string; children: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <strong className="text-[14px] text-ink">{title}</strong>
      <span className="text-[12.5px] text-ink-soft">{children}</span>
    </div>
  );
}

function PreviewChips<K>({
  title,
  description,
  ariaLabel,
  options,
  selected,
  onSelect,
}: PreviewChipsProps<K>) {
  return (
    <div className="flex flex-col gap-2 border-t border-surface-container pt-3">
      <PrefCopy title={title}>{description}</PrefCopy>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={ariaLabel}
      >
        {options.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <button
              key={String(opt.key)}
              type="button"
              aria-pressed={isSelected}
              className={cx(
                "min-h-8 rounded-full border px-2.75 py-1.25 text-[12px] font-semibold transition-colors duration-160",
                isSelected
                  ? "border-primary bg-primary-container text-on-primary"
                  : "border-outline/16 bg-surface-low text-ink-soft hover:bg-surface-container",
              )}
              onClick={() => onSelect(opt.key)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface PwaSanctuarySheetProps {
  guestName: string;
  lowEnergy: boolean;
  onToggleLowEnergy: () => void;
  demoNudgeKey: DemoNudgeKey;
  onSelectDemoNudge: (key: DemoNudgeKey) => void;
  hasLiveBackendSuggestions: boolean;
  bloomieStage: GrowthStage;
  bloomieDemo: BloomieDemo;
  onSelectBloomieDemo: (demo: BloomieDemo) => void;
  pwa: PwaState;
  onClose: () => void;
  onInstalled: () => void;
}

export function PwaSanctuarySheet({
  guestName,
  lowEnergy,
  onToggleLowEnergy,
  demoNudgeKey,
  onSelectDemoNudge,
  hasLiveBackendSuggestions,
  bloomieStage,
  bloomieDemo,
  onSelectBloomieDemo,
  pwa,
  onClose,
  onInstalled,
}: PwaSanctuarySheetProps) {
  return (
    <ModalSheet
      labelledBy="pwa-sheet-title"
      closeLabel="Close sanctuary settings"
      onClose={onClose}
      align="start"
    >
      <div className="flex items-center gap-3 pr-9">
        <TyyniLogo size={42} />
        <div>
          <span className={eyebrowBadge}>Sanctuary App</span>
          <h2
            id="pwa-sheet-title"
            className="mt-1 mb-0 text-[19px] font-semibold tracking-[-0.01em] text-ink"
          >
            {guestName}’s Sanctuary
          </h2>
        </div>
      </div>

      {/* Connectivity & Offline Readiness Card */}
      <div className="flex flex-col gap-1.5 rounded-lg border border-outline/12 bg-surface-low px-4 py-3.5">
        <div className="flex items-center gap-2 text-[14px] text-ink">
          <span className={statusDot({ muted: pwa.isOffline })} />
          <strong>
            {pwa.isOffline
              ? "Offline Mode Active"
              : pwa.swReady
                ? "Offline Sanctuary Ready"
                : "Gentle Mode Active"}
          </strong>
        </div>
        <p className="m-0 text-[13px] leading-[1.48] text-ink-soft">
          {pwa.isOffline
            ? "No connection needed — Bloomie, Box Breathing, synthesized Sound Sanctuary, and your Sensory Anchors continue working offline."
            : "Your breathing pacer, Web Audio soundscapes, and grounding anchors are cached locally so Tyyni stays calm even without signal."}
        </p>
      </div>

      {/* Home Screen App Install Section */}
      <div className="flex flex-col gap-2.5">
        {pwa.isStandalone ? (
          <div className="flex items-center gap-2 rounded-lg bg-secondary-container px-3.5 py-3 text-[13.5px] font-semibold text-on-secondary-container">
            <Icon name="verified" size={18} />
            <span>Installed on your Home Screen · Standalone mode</span>
          </div>
        ) : pwa.canInstallPrompt ? (
          <>
            <p className="m-0 text-[13.5px] leading-[1.48] text-ink-soft">
              Install Tyyni on your device for one-tap full-screen access,
              offline grounding, and SOS breathing shortcuts.
            </p>
            <button
              type="button"
              className={pillButton({ variant: "primary", full: true })}
              onClick={async () => {
                const accepted = await pwa.promptInstall();
                if (accepted) {
                  onInstalled();
                  onClose();
                }
              }}
            >
              <Icon name="download" size={17} />
              <span>Install Tyyni App</span>
            </button>
          </>
        ) : pwa.isIOS ? (
          <div className={iosGuide}>
            <strong>Add Tyyni to your Home Screen</strong>
            <p>
              In Safari, tap the <strong>Share</strong> button below, then
              choose <strong>“Add to Home Screen”</strong> for a calm
              full-screen sanctuary.
            </p>
          </div>
        ) : (
          <div className={iosGuide}>
            <strong>Install as a Home Screen or Dock App</strong>
            <p>
              Use your browser’s address bar install icon or menu (
              <strong>Install Tyyni</strong> / <strong>Add to Dock</strong>) for
              a distraction-free app window.
            </p>
          </div>
        )}
      </div>

      {/* Behavioral Nudge Preview Row (for testing Today page behavioral space) */}
      <PreviewChips
        title="Today Behavioral Nudge"
        description={
          hasLiveBackendSuggestions
            ? "Connected to live backend suggestions (override to preview)"
            : "Preview how Today adapts when backend detects signal changes"
        }
        ariaLabel="Behavioral nudge preview"
        options={DEMO_NUDGE_OPTIONS}
        selected={demoNudgeKey}
        onSelect={onSelectDemoNudge}
      />

      {/* Bloomie growth preview (for testing and demoing the companion's states) */}
      <PreviewChips
        title="Bloomie Growth"
        description={
          bloomieDemo === null
            ? `Live: ${GROWTH_STAGE_NAMES[bloomieStage]} — follows your Tiny Steps and logged wins`
            : "Previewing — pick Live to let your steps and wins move Bloomie again"
        }
        ariaLabel="Bloomie growth preview"
        options={BLOOMIE_DEMO_OPTIONS}
        selected={bloomieDemo}
        onSelect={onSelectBloomieDemo}
      />

      {/* Quick Low-Energy Preference Row */}
      <div className="flex items-center justify-between gap-3 border-t border-surface-container pt-3">
        <PrefCopy title="Low-Energy Mode">
          Softens visuals and trims choices to essentials
        </PrefCopy>
        <button
          type="button"
          className={pillButton({ active: lowEnergy })}
          aria-pressed={lowEnergy}
          onClick={onToggleLowEnergy}
        >
          <Icon name="lowEnergy" size={15} />
          <span>{lowEnergy ? "On" : "Off"}</span>
        </button>
      </div>
    </ModalSheet>
  );
}
