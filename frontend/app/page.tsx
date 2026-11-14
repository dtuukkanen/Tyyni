"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnchorScreen } from "./components/AnchorScreen";
import { CompanionWorld } from "./components/CompanionWorld";
import { GroundScreen } from "./components/GroundScreen";
import { Icon, TyyniLogo } from "./components/icons";
import { PracticeModal } from "./components/PracticeModal";
import { PwaSanctuarySheet, usePwa } from "./components/PwaSanctuarySheet";
import { type SoundPreset, soundEngine } from "./components/soundEngine";
import { TodayScreen } from "./components/TodayScreen";
import { WinsScreen } from "./components/WinsScreen";
import {
  type BackendAnomaly,
  type BackendSuggestion,
  DEMO_NUDGE_OPTIONS,
  type DemoNudgeKey,
  type ResolvedBehavioralNudge,
  resolveBehavioralNudges,
} from "./data/behavioralNudges";
import {
  type AnchorItem,
  type DashboardData,
  INITIAL_ANCHORS,
  type PracticeModalState,
  STARTER_STEPS,
  STARTER_WINS,
  TABS,
  type Tab,
} from "./data/sanctuaryData";

export default function Home() {
  const [tab, setTab] = useState<Tab>("Today");
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [guestName, setGuestName] = useState("Elena");
  const [dateLabel, setDateLabel] = useState("Wednesday, October 24");
  const [lowEnergy, setLowEnergy] = useState(false);

  const [mood, setMood] = useState("Steady");
  const [steps, setSteps] = useState<string[]>(STARTER_STEPS);
  const [checked, setChecked] = useState<number[]>([0]);
  const [waveSent, setWaveSent] = useState(false);
  const [bloomieCelebrating, setBloomieCelebrating] = useState(false);

  const [backendSuggestions, setBackendSuggestions] = useState<
    BackendSuggestion[]
  >([]);
  const [backendAnomalies, setBackendAnomalies] = useState<BackendAnomaly[]>(
    [],
  );
  const [demoNudgeKey, setDemoNudgeKey] = useState<DemoNudgeKey>("none");
  const [dismissedNudgeIds, setDismissedNudgeIds] = useState<number[]>([]);
  const [completedNudgeIds, setCompletedNudgeIds] = useState<number[]>([]);
  const [helpedNudgeIds, setHelpedNudgeIds] = useState<number[]>([]);
  const [nudgeIndex, setNudgeIndex] = useState(0);

  const [wins, setWins] = useState<string[]>(STARTER_WINS);
  const [anchors, setAnchors] = useState<AnchorItem[]>(INITIAL_ANCHORS);
  const [favoritedIds, setFavoritedIds] = useState<string[]>(["blanket"]);

  const [activeSound, setActiveSound] = useState<SoundPreset | null>(null);
  const [modal, setModal] = useState<PracticeModalState | null>(null);
  const [pwaSheetOpen, setPwaSheetOpen] = useState(false);
  const [sensoryIndex, setSensoryIndex] = useState(0);
  const [toast, setToast] = useState("");

  const pwa = usePwa();
  const toastTimerRef = useRef<number | null>(null);
  const joyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab")?.toLowerCase();
    if (requestedTab === "today") setTab("Today");
    else if (requestedTab === "ground") setTab("Ground");
    else if (requestedTab === "wins") setTab("Wins");
    else if (requestedTab === "anchor") setTab("Anchor");

    const requestedNudge = params.get("nudge")?.toLowerCase() as
      | DemoNudgeKey
      | undefined;
    if (
      requestedNudge &&
      DEMO_NUDGE_OPTIONS.some((o) => o.key === requestedNudge)
    ) {
      setDemoNudgeKey(requestedNudge);
    }

    if (params.get("sos") === "1") {
      setTab("Ground");
      setModal({
        mode: "breath",
        category: "Immediate Grounding",
        title: "1-Tap SOS Breathing",
        description:
          "Follow the soft circle. Double inhale gently, then let go with a long, slow sigh.",
        icon: "sos",
      });
      window.history.replaceState({}, "", "/?tab=ground");
    }

    fetch("/api/prototype")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.dashboard) return;
        const next = data.dashboard as DashboardData;
        if (next.userId) setUserId(next.userId);
        if (next.displayName) setGuestName(next.displayName);
        if (next.dateLabel) setDateLabel(next.dateLabel);
        if (next.mood) setMood(next.mood);
        if (next.steps && next.steps.length > 0) {
          setSteps(next.steps.map((s) => s.label));
          setChecked(
            next.steps.flatMap((s, idx) => (s.complete ? [idx] : [])),
          );
        }
        if (next.wins && next.wins.length > 0) {
          setWins(next.wins);
        }
        if (Array.isArray(next.suggestions)) {
          setBackendSuggestions(next.suggestions);
        }
        if (Array.isArray(next.anomalies)) {
          setBackendAnomalies(next.anomalies);
        }
      })
      .catch(() => undefined);

    return () => {
      soundEngine.stop();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (joyTimerRef.current) window.clearTimeout(joyTimerRef.current);
    };
  }, []);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => (current === message ? "" : current));
    }, 2800);
  }, []);

  const triggerBloomieJoy = useCallback(() => {
    setBloomieCelebrating(true);
    if (joyTimerRef.current) window.clearTimeout(joyTimerRef.current);
    joyTimerRef.current = window.setTimeout(() => {
      setBloomieCelebrating(false);
    }, 1700);
  }, []);

  const postSuggestionFeedback = useCallback(
    (suggestionId: number, done: boolean, helped?: boolean | null) => {
      if (suggestionId < 0) return;
      fetch("/api/prototype", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, suggestionId, done, helped }),
      }).catch(() => undefined);
    },
    [userId],
  );

  const behavioralNudges = useMemo(() => {
    const demoPreset = DEMO_NUDGE_OPTIONS.find((o) => o.key === demoNudgeKey);
    const activeSuggestions =
      demoNudgeKey !== "none" && demoPreset
        ? demoPreset.suggestions
        : backendSuggestions;
    const activeAnomalies = demoNudgeKey !== "none" ? [] : backendAnomalies;

    return resolveBehavioralNudges(
      guestName,
      activeSuggestions,
      activeAnomalies,
    )
      .filter((nudge) => !dismissedNudgeIds.includes(nudge.id))
      .map((nudge) => ({
        ...nudge,
        done: nudge.done || completedNudgeIds.includes(nudge.id),
        helped: helpedNudgeIds.includes(nudge.id) ? true : nudge.helped,
      }));
  }, [
    guestName,
    demoNudgeKey,
    backendSuggestions,
    backendAnomalies,
    dismissedNudgeIds,
    completedNudgeIds,
    helpedNudgeIds,
  ]);

  function toggleStep(index: number) {
    setChecked((prev) => {
      const isCompleting = !prev.includes(index);
      if (isCompleting) triggerBloomieJoy();
      return isCompleting ? [...prev, index] : prev.filter((i) => i !== index);
    });
  }

  function handleAddStep(trimmed: string) {
    setSteps((prev) => [...prev, trimmed]);
    triggerBloomieJoy();
    notify("Added a gentle step for today.");
  }

  function handleAddWin(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    setWins((prev) => [trimmed, ...prev]);
    notify(`Placed “${trimmed}” in your Sanctuary Jar.`);
  }

  function handleSoundToggle(preset: SoundPreset, label: string) {
    const next = soundEngine.toggle(preset);
    setActiveSound(next);
    if (next) {
      notify(`Playing ${label} — tap again anytime to pause.`);
    }
  }

  function handleToggleFavorite(anchorId: string) {
    setFavoritedIds((prev) =>
      prev.includes(anchorId)
        ? prev.filter((id) => id !== anchorId)
        : [...prev, anchorId],
    );
  }

  function handleCreateAnchor(created: AnchorItem) {
    setAnchors((prev) => [...prev, created]);
    setFavoritedIds((prev) => [...prev, created.id]);
    notify(`Saved “${created.title}” to your Core Anchors.`);
  }

  function openSensoryGuide(startIndex: number) {
    setSensoryIndex(startIndex);
    setModal({
      mode: "sensory",
      category: "5–4–3–2–1 Grounding",
      title: "Present Senses Tether",
      description: "Move gently through each sense at your own pace.",
      icon: "flower",
    });
  }

  function handleStartBehavioralNudge(nudge: ResolvedBehavioralNudge) {
    setCompletedNudgeIds((prev) =>
      prev.includes(nudge.id) ? prev : [...prev, nudge.id],
    );
    postSuggestionFeedback(nudge.id, true, nudge.helped);
    triggerBloomieJoy();

    const { action } = nudge;
    switch (action.type) {
      case "open_practice":
        setModal(action.modal);
        break;
      case "open_sensory":
        openSensoryGuide(0);
        break;
      case "play_sound": {
        const next =
          activeSound === action.preset
            ? activeSound
            : soundEngine.toggle(action.preset);
        setActiveSound(next);
        notify(`Playing ${action.label} — tap Sound on above anytime to pause.`);
        break;
      }
      case "message_friend":
        setWaveSent(true);
        notify("Sent a warm wave to your Gentle Circle.");
        document
          .getElementById("gentle-circle-section")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      case "navigate_tab":
        setTab(action.tab);
        window.scrollTo({ top: 0, behavior: "smooth" });
        notify(action.toast);
        break;
      case "add_step":
        setSteps((prev) =>
          prev.includes(action.stepLabel) ? prev : [action.stepLabel, ...prev],
        );
        notify("Added gentle suggestion to Today’s Tiny Steps.");
        document
          .getElementById("today-steps")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
    }
  }

  function handleDismissBehavioralNudge(nudge: ResolvedBehavioralNudge) {
    setDismissedNudgeIds((prev) => [...prev, nudge.id]);
    if (!nudge.done) {
      postSuggestionFeedback(nudge.id, false, null);
    }
  }

  function handleMarkNudgeHelped(nudge: ResolvedBehavioralNudge) {
    setHelpedNudgeIds((prev) =>
      prev.includes(nudge.id) ? prev : [...prev, nudge.id],
    );
    postSuggestionFeedback(nudge.id, true, true);
    triggerBloomieJoy();
    notify("Noted — Tyyni will remember this felt helpful.");
  }

  const closeModal = useCallback(() => setModal(null), []);

  return (
    <div className={`tyyni-shell ${tab === "Today" ? "is-today-world" : ""}`}>
      {tab === "Today" && (
        <CompanionWorld
          mood={mood}
          lowEnergy={lowEnergy}
          isCelebrating={bloomieCelebrating}
        />
      )}

      {/* Top Bar */}
      <header className="topbar">
        <div className="brand-group">
          <TyyniLogo size={32} />
          <div className="brand-stack">
            <div className="brand-text">
              <span className="brand-title">Tyyni</span>
              <span className="brand-sep" aria-hidden="true">
                •
              </span>
              <span className="brand-section">{tab.toUpperCase()}</span>
            </div>
            <span className="brand-sub">Sanctuary</span>
          </div>
        </div>

        <div className="topbar-actions">
          {pwa.isOffline && (
            <button
              type="button"
              className="offline-pill-indicator"
              onClick={() => setPwaSheetOpen(true)}
              aria-label="Offline Sanctuary active"
            >
              <Icon name="wifiOff" size={13} />
              <span>Offline</span>
            </button>
          )}
          {activeSound && (
            <button
              type="button"
              className="audio-pill-indicator"
              onClick={() => {
                soundEngine.stop();
                setActiveSound(null);
              }}
              aria-label="Stop ambient sound"
            >
              <Icon name="pause" size={13} />
              <span>Sound on</span>
            </button>
          )}
          <button
            type="button"
            className={`low-energy-top-btn ${lowEnergy ? "is-active" : ""}`}
            aria-pressed={lowEnergy}
            onClick={() => setLowEnergy((v) => !v)}
          >
            <Icon name="lowEnergy" size={14} />
            <span>Low-Energy</span>
          </button>
          <button
            type="button"
            className="profile-btn"
            aria-label={`${guestName}'s sanctuary & app settings`}
            onClick={() => setPwaSheetOpen(true)}
          >
            <span className="profile-avatar">
              <Icon name="user" size={18} />
              {pwa.canInstallPrompt && !pwa.isStandalone && (
                <span className="install-ready-dot" aria-hidden="true" />
              )}
            </span>
          </button>
        </div>
      </header>

      {tab === "Today" && (
        <TodayScreen
          guestName={guestName}
          dateLabel={dateLabel}
          lowEnergy={lowEnergy}
          onExitLowEnergy={() => setLowEnergy(false)}
          behavioralNudges={behavioralNudges}
          activeNudgeIndex={nudgeIndex}
          onCycleNudge={() => setNudgeIndex((i) => i + 1)}
          onDismissNudge={handleDismissBehavioralNudge}
          onStartNudge={handleStartBehavioralNudge}
          onMarkNudgeHelped={handleMarkNudgeHelped}
          mood={mood}
          onSelectMood={(nextMood) => {
            setMood(nextMood);
            triggerBloomieJoy();
          }}
          steps={steps}
          checked={checked}
          onToggleStep={toggleStep}
          onAddStep={handleAddStep}
          waveSent={waveSent}
          onSendWave={() => {
            setWaveSent(true);
            triggerBloomieJoy();
            notify("Sent a quiet wave to Liam, Maya, Sofia, and Marcus.");
          }}
          onInteractCompanion={() => {
            triggerBloomieJoy();
            notify("Bloomie sways happily in the gentle breeze with you.");
          }}
        />
      )}

      {tab === "Ground" && (
        <GroundScreen
          activeSound={activeSound}
          onSoundToggle={handleSoundToggle}
          onOpenModal={setModal}
        />
      )}

      {tab === "Wins" && <WinsScreen wins={wins} onAddWin={handleAddWin} />}

      {tab === "Anchor" && (
        <AnchorScreen
          guestName={guestName}
          anchors={anchors}
          favoritedIds={favoritedIds}
          onToggleFavorite={handleToggleFavorite}
          onCreateAnchor={handleCreateAnchor}
          activeSound={activeSound}
          onSoundToggle={handleSoundToggle}
          onOpenSensoryGuide={openSensoryGuide}
          onOpenModal={setModal}
          onNotify={notify}
        />
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav" aria-label="Primary sections">
        {TABS.map(({ name, icon }) => {
          const isActive = tab === name;
          return (
            <button
              key={name}
              type="button"
              className={`nav-tab ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                setTab(name);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <Icon
                name={name === "Wins" && isActive ? "heartFilled" : icon}
                size={22}
              />
              <span>{name}</span>
            </button>
          );
        })}
      </nav>

      {/* Interactive Somatic Rhythm Pacer / Sensory Modal */}
      {modal && (
        <PracticeModal
          modal={modal}
          sensoryIndex={sensoryIndex}
          onSensoryIndexChange={setSensoryIndex}
          onClose={closeModal}
          onCompleteSensory={() => {
            setModal(null);
            notify("5–4–3–2–1 reset complete. Welcome back.");
          }}
        />
      )}

      {/* Sanctuary App & Offline PWA Sheet */}
      {pwaSheetOpen && (
        <PwaSanctuarySheet
          guestName={guestName}
          lowEnergy={lowEnergy}
          onToggleLowEnergy={() => setLowEnergy((v) => !v)}
          demoNudgeKey={demoNudgeKey}
          onSelectDemoNudge={(key) => {
            setDemoNudgeKey(key);
            setDismissedNudgeIds([]);
            setNudgeIndex(0);
            setTab("Today");
            setPwaSheetOpen(false);
          }}
          hasLiveBackendSuggestions={
            backendSuggestions.length > 0 || backendAnomalies.length > 0
          }
          pwa={pwa}
          onClose={() => setPwaSheetOpen(false)}
          onInstalled={() =>
            notify("Tyyni added to your Home Screen sanctuary.")
          }
        />
      )}

      {/* Soft Toast Notification */}
      {toast && (
        <div className="gentle-toast" role="status" aria-live="polite">
          <Icon name="spa" size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
