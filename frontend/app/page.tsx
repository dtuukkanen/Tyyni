"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnchorScreen } from "./components/AnchorScreen";
import { CompanionWorld } from "./components/CompanionWorld";
import { GroundScreen } from "./components/GroundScreen";
import { Icon, TyyniLogo } from "./components/icons";
import { JournalScreen } from "./components/JournalScreen";
import { PracticeModal } from "./components/PracticeModal";
import { PwaSanctuarySheet, usePwa } from "./components/PwaSanctuarySheet";
import { type SoundPreset, soundEngine } from "./components/soundEngine";
import { TodayScreen } from "./components/TodayScreen";
import { cx } from "./components/ui/styles";
import {
  GROWTH_STAGE_NAMES,
  type GrowthStage,
  useBloomieGrowth,
} from "./components/useBloomieGrowth";
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
  LOW_ENERGY_BREATH,
  LOW_ENERGY_STEPS,
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
  const [checked, setChecked] = useState<number[]>([]);
  const [waveSent, setWaveSent] = useState(false);
  const [warmthSentTo, setWarmthSentTo] = useState<string[]>([]);
  const [restChecked, setRestChecked] = useState<number[]>([]);
  const [restingShared, setRestingShared] = useState(false);
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
  // Wins logged now (not the sample history); each counts as a done task.
  const [winsLogged, setWinsLogged] = useState(0);
  const [anchors, setAnchors] = useState<AnchorItem[]>(INITIAL_ANCHORS);
  const [favoritedIds, setFavoritedIds] = useState<string[]>(["blanket"]);

  const [activeSound, setActiveSound] = useState<SoundPreset | null>(null);
  const [modal, setModal] = useState<PracticeModalState | null>(null);
  const [pwaSheetOpen, setPwaSheetOpen] = useState(false);
  const [sensoryIndex, setSensoryIndex] = useState(0);
  const [toast, setToast] = useState("");
  const [dataReady, setDataReady] = useState(false);

  const pwa = usePwa();
  const toastTimerRef = useRef<number | null>(null);
  const joyTimerRef = useRef<number | null>(null);
  const growthToastTimerRef = useRef<number | null>(null);
  const bloomieDemoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab")?.toLowerCase();
    // oxlint-disable-next-line react/set-state-in-effect -- URL params are read after hydration
    if (requestedTab === "today") setTab("Today");
    else if (requestedTab === "ground") setTab("Ground");
    else if (requestedTab === "wins") setTab("Wins");
    else if (requestedTab === "journal") setTab("Journal");
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
          setChecked(next.steps.flatMap((s, idx) => (s.complete ? [idx] : [])));
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
      .catch(() => undefined)
      .finally(() => setDataReady(true));

    return () => {
      soundEngine.stop();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (joyTimerRef.current) window.clearTimeout(joyTimerRef.current);
      if (growthToastTimerRef.current) {
        window.clearTimeout(growthToastTimerRef.current);
      }
      if (bloomieDemoTimerRef.current) {
        window.clearTimeout(bloomieDemoTimerRef.current);
      }
    };
  }, []);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => (current === message ? "" : current));
    }, 2800);
  }, []);

  const announceGrowth = useCallback(
    (stage: GrowthStage) => {
      // Land after any other toast, once the new growth is visible.
      if (growthToastTimerRef.current) {
        window.clearTimeout(growthToastTimerRef.current);
      }
      growthToastTimerRef.current = window.setTimeout(() => {
        notify(`Bloomie is ${GROWTH_STAGE_NAMES[stage].toLowerCase()}.`);
      }, 1100);
    },
    [notify],
  );

  // Bloomie follows the checklist on screen (Just the Basics in low-energy
  // mode) plus logged wins; resting in low-energy mode never looks thirsty.
  const doneTasks =
    (lowEnergy ? restChecked.length : checked.length) + winsLogged;
  const totalTasks =
    (lowEnergy ? LOW_ENERGY_STEPS.length : steps.length) + winsLogged;
  const growth = useBloomieGrowth({
    doneTasks,
    totalTasks,
    floor: lowEnergy ? 1 : 0,
    dataReady,
    onStageUp: announceGrowth,
  });

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
    const isCompleting = !checked.includes(index);
    const nextChecked = isCompleting
      ? [...checked, index]
      : checked.filter((i) => i !== index);
    growth.tasksChanged(
      nextChecked.length + winsLogged,
      steps.length + winsLogged,
    );
    if (isCompleting) triggerBloomieJoy();
    setChecked(nextChecked);
  }

  function toggleLowEnergy() {
    if (!lowEnergy) {
      notify("Low-energy mode: fewer choices, slower motion.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setLowEnergy(!lowEnergy);
  }

  function toggleRestStep(index: number) {
    const isCompleting = !restChecked.includes(index);
    const nextRest = isCompleting
      ? [...restChecked, index]
      : restChecked.filter((i) => i !== index);
    growth.tasksChanged(
      nextRest.length + winsLogged,
      LOW_ENERGY_STEPS.length + winsLogged,
    );
    if (isCompleting) triggerBloomieJoy();
    setRestChecked(nextRest);
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
    setWinsLogged(winsLogged + 1);
    growth.tasksChanged(doneTasks + 1, totalTasks + 1);
    notify(`Placed “${trimmed}” in your Sanctuary Jar.`);
  }

  async function handleSaveJournal(text: string): Promise<boolean> {
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, text }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) return false;
    } catch {
      return false;
    }
    triggerBloomieJoy();
    notify("Saved to your journal.");
    return true;
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
        notify(
          `Playing ${action.label} — tap Sound on above anytime to pause.`,
        );
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
        if (!steps.includes(action.stepLabel)) {
          // The new step goes first, so shift the checked marks with their steps.
          setSteps([action.stepLabel, ...steps]);
          setChecked(checked.map((i) => i + 1));
        }
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

  // Bloomie previews from the settings sheet: close the sheet and show Today
  // first, so the change plays in view.
  function showBloomieChange(apply: () => void) {
    setPwaSheetOpen(false);
    setTab("Today");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (bloomieDemoTimerRef.current) {
      window.clearTimeout(bloomieDemoTimerRef.current);
    }
    bloomieDemoTimerRef.current = window.setTimeout(apply, 450);
  }

  const closeModal = useCallback(() => setModal(null), []);

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-surface md:shadow-[0_0_60px_-12px_rgba(34,72,64,0.14),0_0_0_1px_rgba(113,121,118,0.14)]">
      {tab === "Today" && (
        <CompanionWorld
          mood={mood}
          lowEnergy={lowEnergy}
          isCelebrating={bloomieCelebrating}
          growthStage={growth.stage}
          isGrowing={growth.isGrowing}
          isSettling={growth.isSettling}
          // Same condition as TodayScreen's compact greeting card.
          compact={lowEnergy || behavioralNudges.length > 0}
        />
      )}

      {/* Top Bar */}
      <header
        className={cx(
          "sticky top-0 z-30 flex min-h-[calc(64px+env(safe-area-inset-top))] items-center justify-between border-b px-4.5 pt-[env(safe-area-inset-top)] standalone:select-none",
          tab === "Today"
            ? "border-ink/6 bg-surface/88 shadow-[0_1px_12px_rgba(0,0,0,0.03)] backdrop-blur-[22px]"
            : "border-outline/8 bg-surface/90 backdrop-blur-[18px]",
        )}
      >
        <div className="flex items-center gap-2.5">
          <TyyniLogo size={32} />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[19px] leading-[1.15] font-bold tracking-[-0.02em] text-primary">
              Tyyni
            </span>
            <span
              className="text-[13px] text-outline-variant"
              aria-hidden="true"
            >
              •
            </span>
            <span className="text-[11px] font-semibold tracking-[0.05em] text-ink-muted">
              {tab.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pwa.isOffline && (
            <button
              type="button"
              className="inline-flex min-h-8.5 items-center gap-1.25 rounded-full border border-outline/18 bg-surface-container px-2.75 text-[11.5px] font-semibold text-ink-soft"
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
              className="inline-flex min-h-8.5 items-center gap-1.25 rounded-full bg-primary-fixed px-2.75 text-[11.5px] font-semibold text-on-primary-fixed transition-colors"
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
            className={cx(
              "inline-flex min-h-8.5 items-center gap-1.5 rounded-full border px-3 py-1.25 text-[11.5px] font-semibold shadow-[0_2px_8px_rgba(34,72,64,0.05)] transition-colors",
              lowEnergy
                ? "border-primary bg-primary-container text-on-primary"
                : "border-outline/14 bg-white/92 text-ink-soft hover:bg-white",
            )}
            aria-pressed={lowEnergy}
            onClick={toggleLowEnergy}
          >
            <Icon name="lowEnergy" size={14} />
            <span>Low-Energy</span>
          </button>
          <button
            type="button"
            className="group inline-flex size-10 items-center justify-center rounded-full"
            aria-label={`${guestName}'s sanctuary & app settings`}
            onClick={() => setPwaSheetOpen(true)}
          >
            <span className="relative flex size-8.5 items-center justify-center rounded-full bg-primary-container text-on-primary transition-colors group-hover:bg-primary">
              <Icon name="user" size={18} />
              {pwa.canInstallPrompt && !pwa.isStandalone && (
                <span
                  className="absolute -top-px -right-px size-2.5 rounded-full border-2 border-surface bg-secondary-container"
                  aria-hidden="true"
                />
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
          restChecked={restChecked}
          onToggleRestStep={toggleRestStep}
          lowEnergySoundOn={activeSound === "purr"}
          onToggleLowEnergySound={() =>
            handleSoundToggle("purr", "soft brown noise")
          }
          onStartSlowExhale={() => setModal(LOW_ENERGY_BREATH)}
          restingShared={restingShared}
          onShareResting={() => {
            if (restingShared) return;
            setRestingShared(true);
            notify("Your circle knows you’re resting. No replies expected.");
          }}
          waveSent={waveSent}
          onSendWave={() => {
            setWaveSent(true);
            triggerBloomieJoy();
            notify("Sent a quiet wave to Liam, Maya, Marcus, and Sofia.");
          }}
          warmthSentTo={warmthSentTo}
          onSendWarmth={(name) => {
            if (warmthSentTo.includes(name)) return;
            setWarmthSentTo((prev) => [...prev, name]);
            triggerBloomieJoy();
            notify(`${name} will see a little warmth from you.`);
          }}
          growthStage={growth.stage}
          growthDone={doneTasks}
          growthTotal={totalTasks}
          growthPreview={growth.demo !== null}
          isGrowing={growth.isGrowing}
          isSettling={growth.isSettling}
          onInteractCompanion={triggerBloomieJoy}
        />
      )}

      {tab === "Ground" && (
        <GroundScreen
          activeSound={activeSound}
          onSoundToggle={handleSoundToggle}
          onOpenModal={setModal}
        />
      )}

      {tab === "Wins" && (
        <WinsScreen
          wins={wins}
          onAddWin={handleAddWin}
          mood={mood}
          lowEnergy={lowEnergy}
          growthStage={growth.stage}
          isGrowing={growth.isGrowing}
          isSettling={growth.isSettling}
        />
      )}

      {tab === "Journal" && <JournalScreen onSave={handleSaveJournal} />}

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
      <nav
        className="fixed bottom-0 left-1/2 z-30 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-[repeat(5,1fr)] gap-1 border-t border-outline/10 bg-surface/94 px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] backdrop-blur-[20px] md:border-x md:border-x-outline/14 standalone:select-none"
        aria-label="Primary sections"
      >
        {TABS.map(({ name, icon }) => {
          const isActive = tab === name;
          return (
            <button
              key={name}
              type="button"
              className={cx(
                "flex min-h-13 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.25 text-[12px] transition-colors",
                isActive
                  ? "bg-secondary-container font-semibold text-on-secondary-container"
                  : "font-medium text-ink-soft hover:bg-secondary-container/30 hover:text-primary",
              )}
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
          onToggleLowEnergy={toggleLowEnergy}
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
          bloomieStage={growth.stage}
          bloomieDemo={growth.demo}
          onSelectBloomieDemo={(demo) =>
            showBloomieChange(() => growth.setDemo(demo))
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
        <div
          className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] left-1/2 z-45 inline-flex max-w-[calc(100vw-40px)] -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4.5 py-3 text-[13.5px] font-medium text-on-primary shadow-[0_12px_28px_rgba(27,40,35,0.22)]"
          role="status"
          aria-live="polite"
        >
          <Icon name="spa" size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
