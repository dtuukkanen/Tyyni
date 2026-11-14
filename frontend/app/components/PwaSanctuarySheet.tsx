"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEMO_NUDGE_OPTIONS,
  type DemoNudgeKey,
} from "../data/behavioralNudges";
import { Icon, TyyniLogo } from "./icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface PwaState {
  isOffline: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  canInstallPrompt: boolean;
  swReady: boolean;
  promptInstall: () => Promise<boolean>;
}

export function usePwa(): PwaState {
  const [isOffline, setIsOffline] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const iosDetected =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(iosDetected);

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const checkStandalone = () => {
      const navStandalone = Boolean(
        (navigator as Navigator & { standalone?: boolean }).standalone,
      );
      setIsStandalone(standaloneQuery.matches || navStandalone);
    };
    checkStandalone();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    standaloneQuery.addEventListener("change", checkStandalone);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .then(() => setSwReady(true))
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      standaloneQuery.removeEventListener("change", checkStandalone);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    isOffline,
    isStandalone,
    isIOS,
    canInstallPrompt: deferredPrompt !== null,
    swReady,
    promptInstall,
  };
}

export interface PwaSanctuarySheetProps {
  guestName: string;
  lowEnergy: boolean;
  onToggleLowEnergy: () => void;
  demoNudgeKey: DemoNudgeKey;
  onSelectDemoNudge: (key: DemoNudgeKey) => void;
  hasLiveBackendSuggestions: boolean;
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
  pwa,
  onClose,
  onInstalled,
}: PwaSanctuarySheetProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-sheet-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet pwa-sheet">
        <button
          type="button"
          className="modal-close-btn"
          aria-label="Close sanctuary settings"
          onClick={onClose}
        >
          <Icon name="close" size={20} />
        </button>

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
                <strong>Install Tyyni</strong> / <strong>Add to Dock</strong>)
                for a distraction-free app window.
              </p>
            </div>
          )}
        </div>

        {/* Behavioral Nudge Preview Row (for testing Today page behavioral space) */}
        <div className="pwa-demo-section">
          <div className="pwa-pref-copy">
            <strong>Today Behavioral Nudge</strong>
            <span>
              {hasLiveBackendSuggestions
                ? "Connected to live backend suggestions (override to preview)"
                : "Preview how Today adapts when backend detects signal changes"}
            </span>
          </div>
          <div className="pwa-demo-chips" role="group" aria-label="Behavioral nudge preview">
            {DEMO_NUDGE_OPTIONS.map((opt) => {
              const isSelected = demoNudgeKey === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={isSelected}
                  className={`pwa-demo-chip ${isSelected ? "is-selected" : ""}`}
                  onClick={() => onSelectDemoNudge(opt.key)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

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
      </div>
    </div>
  );
}
