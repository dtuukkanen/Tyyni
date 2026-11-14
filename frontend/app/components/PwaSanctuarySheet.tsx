"use client";

import {
  DEMO_NUDGE_OPTIONS,
  type DemoNudgeKey,
} from "../data/behavioralNudges";
import { Icon, TyyniLogo } from "./icons";
import { ModalSheet } from "./ui/ModalSheet";
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
function PreviewChips<K>({
  title,
  description,
  ariaLabel,
  options,
  selected,
  onSelect,
}: PreviewChipsProps<K>) {
  return (
    <div className="pwa-demo-section">
      <div className="pwa-pref-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <div className="pwa-demo-chips" role="group" aria-label={ariaLabel}>
        {options.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <button
              key={String(opt.key)}
              type="button"
              aria-pressed={isSelected}
              className={`pwa-demo-chip ${isSelected ? "is-selected" : ""}`}
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
      className="pwa-sheet"
    >
      <div className="pwa-sheet-header">
        <TyyniLogo size={42} />
        <div>
          <span className="eyebrow-badge">Sanctuary App</span>
          <h2 id="pwa-sheet-title" className="section-heading pwa-sheet-title">
            {guestName}’s Sanctuary
          </h2>
        </div>
      </div>

      {/* Connectivity & Offline Readiness Card */}
      <div className="pwa-status-card">
        <div className="pwa-status-row">
          <span
            className={`status-dot ${pwa.isOffline ? "status-dot-muted" : ""}`}
          />
          <strong>
            {pwa.isOffline
              ? "Offline Mode Active"
              : pwa.swReady
                ? "Offline Sanctuary Ready"
                : "Gentle Mode Active"}
          </strong>
        </div>
        <p className="pwa-status-copy">
          {pwa.isOffline
            ? "No connection needed — Bloomie, Box Breathing, synthesized Sound Sanctuary, and your Sensory Anchors continue working offline."
            : "Your breathing pacer, Web Audio soundscapes, and grounding anchors are cached locally so Tyyni stays calm even without signal."}
        </p>
      </div>

      {/* Home Screen App Install Section */}
      <div className="pwa-install-box">
        {pwa.isStandalone ? (
          <div className="pwa-installed-pill">
            <Icon name="verified" size={18} />
            <span>Installed on your Home Screen · Standalone mode</span>
          </div>
        ) : pwa.canInstallPrompt ? (
          <>
            <p className="pwa-install-copy">
              Install Tyyni on your device for one-tap full-screen access,
              offline grounding, and SOS breathing shortcuts.
            </p>
            <button
              type="button"
              className="btn-primary-pill btn-full"
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
          <div className="pwa-ios-guide">
            <strong>Add Tyyni to your Home Screen</strong>
            <p>
              In Safari, tap the <strong>Share</strong> button below, then
              choose <strong>“Add to Home Screen”</strong> for a calm
              full-screen sanctuary.
            </p>
          </div>
        ) : (
          <div className="pwa-ios-guide">
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
      <div className="pwa-pref-row">
        <div className="pwa-pref-copy">
          <strong>Low-Energy Mode</strong>
          <span>Softens visuals and trims choices to essentials</span>
        </div>
        <button
          type="button"
          className={`btn-secondary-pill ${lowEnergy ? "is-active" : ""}`}
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
