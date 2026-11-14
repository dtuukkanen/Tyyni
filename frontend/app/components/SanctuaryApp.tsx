"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AnchorScreen } from "./AnchorScreen";
import { CompanionWorld } from "./CompanionWorld";
import type { GroundScreen } from "./GroundScreen";
import { Icon, TyyniLogo } from "./icons";
import type { JournalScreen } from "./JournalScreen";
import { type SoundPreset, soundEngine } from "./soundEngine";
import type { TodayScreen } from "./TodayScreen";
import {
  type BloomieDemo,
  GROWTH_STAGE_NAMES,
  type GrowthStage,
  useBloomieGrowth,
} from "./useBloomieGrowth";
import { usePwa } from "./usePwa";
import type { WinsScreen } from "./WinsScreen";
import {
  type BackendAnomaly,
  type BackendSuggestion,
  DEMO_NUDGE_OPTIONS,
  type DemoNudgeKey,
  type ResolvedBehavioralNudge,
  resolveBehavioralNudges,
} from "../data/behavioralNudges";
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
  tabForPath,
  tabHref,
} from "../data/sanctuaryData";

// Only shown on demand, so they load in their own chunks when first opened.
const PracticeModal = dynamic(() =>
  import("./PracticeModal").then((m) => m.PracticeModal),
);
const PwaSanctuarySheet = dynamic(() =>
  import("./PwaSanctuarySheet").then((m) => m.PwaSanctuarySheet),
);

const SOS_MODAL: PracticeModalState = {
  mode: "breath",
  category: "Immediate Grounding",
  title: "1-Tap SOS Breathing",
  description:
    "Follow the soft circle. Double inhale gently, then let go with a long, slow sigh.",
  icon: "sos",
};

export type SanctuaryAppProps = {
  /** Today's data, read on the server; empty fields keep the sample content. */
  dashboard: DashboardData;
  /** The current tab's page. */
  children: ReactNode;
};

/**
 * Props for every tab's screen. The state lives here in the layout, so it
 * survives moving between tabs; each tab's page picks its own entry, and
 * only that page's chunk imports the screen component.
 */
export type SanctuaryScreens = {
  today: ComponentProps<typeof TodayScreen>;
  ground: ComponentProps<typeof GroundScreen>;
  wins: ComponentProps<typeof WinsScreen>;
  journal: ComponentProps<typeof JournalScreen>;
  anchor: ComponentProps<typeof AnchorScreen>;
};

const SanctuaryContext = createContext<SanctuaryScreens | null>(null);

export function useSanctuaryScreens(): SanctuaryScreens {
  const screens = use(SanctuaryContext);
  if (!screens) throw new Error("Tab pages must render inside SanctuaryApp");
  return screens;
}

/** Demo and shortcut options from the URL on first load. */
function readUrlOptions(params: URLSearchParams) {
  const nudge = params.get("nudge")?.toLowerCase();
  const growth = params.get("growth")?.toLowerCase();
  let growthDemo: BloomieDemo = null;
  if (growth === "play") growthDemo = "play";
  else if (growth && /^[0-2]$/.test(growth)) {
    growthDemo = Number(growth) as BloomieDemo;
  }
  return {
    demoNudge: DEMO_NUDGE_OPTIONS.find((o) => o.key === nudge)?.key ?? "none",
    growthDemo,
    /** `?sos=1`: open the SOS breathing pacer straight away. */
    sos: params.get("sos") === "1",
  } satisfies {
    demoNudge: DemoNudgeKey;
    growthDemo: BloomieDemo;
    sos: boolean;
  };
}

const NO_SUGGESTIONS: BackendSuggestion[] = [];
const NO_ANOMALIES: BackendAnomaly[] = [];

export function SanctuaryApp({ dashboard, children }: SanctuaryAppProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The layout stays mounted across tabs, so these apply to the first load only.
  const [urlOptions] = useState(() => readUrlOptions(searchParams));
  const { sos } = urlOptions;
  const initialSteps =
    dashboard.steps && dashboard.steps.length > 0 ? dashboard.steps : null;

  const tab = tabForPath(pathname);
  const setTab = (next: Tab) => router.push(tabHref(next));
  const userId = dashboard.userId;
  const guestName = dashboard.displayName || "Elena";
  const dateLabel = dashboard.dateLabel || "Wednesday, October 24";
  const [lowEnergy, setLowEnergy] = useState(false);

  const [mood, setMood] = useState(dashboard.mood || "Steady");
  const [steps, setSteps] = useState<string[]>(() =>
    initialSteps ? initialSteps.map((s) => s.label) : STARTER_STEPS,
  );
  const [checked, setChecked] = useState<number[]>(() =>
    initialSteps
      ? initialSteps.flatMap((s, idx) => (s.complete ? [idx] : []))
      : [],
  );
  const [waveSent, setWaveSent] = useState(false);
  const [warmthSentTo, setWarmthSentTo] = useState<string[]>([]);
  const [restChecked, setRestChecked] = useState<number[]>([]);
  const [restingShared, setRestingShared] = useState(false);
  const [bloomieCelebrating, setBloomieCelebrating] = useState(false);

  const backendSuggestions: BackendSuggestion[] = Array.isArray(
    dashboard.suggestions,
  )
    ? dashboard.suggestions
    : NO_SUGGESTIONS;
  const backendAnomalies: BackendAnomaly[] = Array.isArray(dashboard.anomalies)
    ? dashboard.anomalies
    : NO_ANOMALIES;
  const [demoNudgeKey, setDemoNudgeKey] = useState<DemoNudgeKey>(
    urlOptions.demoNudge,
  );
  const [dismissedNudgeIds, setDismissedNudgeIds] = useState<number[]>([]);
  const [completedNudgeIds, setCompletedNudgeIds] = useState<number[]>([]);
  const [helpedNudgeIds, setHelpedNudgeIds] = useState<number[]>([]);
  const [nudgeIndex, setNudgeIndex] = useState(0);

  const [wins, setWins] = useState<string[]>(() =>
    dashboard.wins && dashboard.wins.length > 0 ? dashboard.wins : STARTER_WINS,
  );
  // Wins logged now (not the sample history); each counts as a done task.
  const [winsLogged, setWinsLogged] = useState(0);
  const [anchors, setAnchors] = useState<AnchorItem[]>(INITIAL_ANCHORS);
  const [favoritedIds, setFavoritedIds] = useState<string[]>(["blanket"]);

  const [activeSound, setActiveSound] = useState<SoundPreset | null>(null);
  const [modal, setModal] = useState<PracticeModalState | null>(
    sos ? SOS_MODAL : null,
  );
  const [pwaSheetOpen, setPwaSheetOpen] = useState(false);
  const [sensoryIndex, setSensoryIndex] = useState(0);
  const [toast, setToast] = useState("");

  const pwa = usePwa();
  const toastTimerRef = useRef<number | null>(null);
  const joyTimerRef = useRef<number | null>(null);
  const growthToastTimerRef = useRef<number | null>(null);
  const bloomieDemoTimerRef = useRef<number | null>(null);

  // Drop `sos=1` (so a reload doesn't reopen the pacer) and the `tab=` left
  // by the old-URL redirect; demo parameters like `nudge` stay. First load only.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("sos") && !url.searchParams.has("tab")) return;
    url.searchParams.delete("sos");
    url.searchParams.delete("tab");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  useEffect(() => {
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
    initialDemo: urlOptions.growthDemo,
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

  const closeModal = () => setModal(null);

  const screens: SanctuaryScreens = {
    today: {
      guestName,
      dateLabel,
      lowEnergy,
      onExitLowEnergy: () => setLowEnergy(false),
      behavioralNudges,
      activeNudgeIndex: nudgeIndex,
      onCycleNudge: () => setNudgeIndex((i) => i + 1),
      onDismissNudge: handleDismissBehavioralNudge,
      onStartNudge: handleStartBehavioralNudge,
      onMarkNudgeHelped: handleMarkNudgeHelped,
      mood,
      onSelectMood: (nextMood) => {
        setMood(nextMood);
        triggerBloomieJoy();
      },
      steps,
      checked,
      onToggleStep: toggleStep,
      onAddStep: handleAddStep,
      restChecked,
      onToggleRestStep: toggleRestStep,
      lowEnergySoundOn: activeSound === "purr",
      onToggleLowEnergySound: () =>
        handleSoundToggle("purr", "soft brown noise"),
      onStartSlowExhale: () => setModal(LOW_ENERGY_BREATH),
      restingShared,
      onShareResting: () => {
        if (restingShared) return;
        setRestingShared(true);
        notify("Your circle knows you’re resting. No replies expected.");
      },
      waveSent,
      onSendWave: () => {
        setWaveSent(true);
        triggerBloomieJoy();
        notify("Sent a quiet wave to Liam, Maya, Marcus, and Sofia.");
      },
      warmthSentTo,
      onSendWarmth: (name) => {
        if (warmthSentTo.includes(name)) return;
        setWarmthSentTo((prev) => [...prev, name]);
        triggerBloomieJoy();
        notify(`${name} will see a little warmth from you.`);
      },
      growthStage: growth.stage,
      growthDone: doneTasks,
      growthTotal: totalTasks,
      growthPreview: growth.demo !== null,
      isGrowing: growth.isGrowing,
      isSettling: growth.isSettling,
      onInteractCompanion: triggerBloomieJoy,
    },
    ground: {
      activeSound,
      onSoundToggle: handleSoundToggle,
      onOpenModal: setModal,
    },
    wins: {
      wins,
      onAddWin: handleAddWin,
      mood,
      lowEnergy,
      growthStage: growth.stage,
      isGrowing: growth.isGrowing,
      isSettling: growth.isSettling,
    },
    journal: { onSave: handleSaveJournal },
    anchor: {
      guestName,
      anchors,
      favoritedIds,
      onToggleFavorite: handleToggleFavorite,
      onCreateAnchor: handleCreateAnchor,
      activeSound,
      onSoundToggle: handleSoundToggle,
      onOpenSensoryGuide: openSensoryGuide,
      onOpenModal: setModal,
      onNotify: notify,
    },
  };

  return (
    <div
      className={`tyyni-shell ${tab === "Today" ? "is-today-world" : ""} ${
        lowEnergy ? "is-low-energy" : ""
      }`}
    >
      {tab === "Today" && (
        <CompanionWorld
          mood={mood}
          lowEnergy={lowEnergy}
          isCelebrating={bloomieCelebrating}
          growthStage={growth.stage}
          isGrowing={growth.isGrowing}
          isSettling={growth.isSettling}
        />
      )}

      {/* Top Bar */}
      <header className="topbar">
        <div className="brand-group">
          <TyyniLogo size={32} />
          <div className="brand-text">
            <span className="brand-title">Tyyni</span>
            <span className="brand-sep" aria-hidden="true">
              •
            </span>
            <span className="brand-section">{tab.toUpperCase()}</span>
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
            onClick={toggleLowEnergy}
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

      {/* oxlint-disable-next-line react/jsx-no-constructed-context-values -- the React Compiler memoizes `screens` */}
      <SanctuaryContext value={screens}>{children}</SanctuaryContext>

      {/* Bottom Navigation */}
      <nav className="bottom-nav" aria-label="Primary sections">
        {TABS.map(({ name, icon, href }) => {
          const isActive = tab === name;
          return (
            <Link
              key={name}
              href={href}
              className={`nav-tab ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                name={name === "Wins" && isActive ? "heartFilled" : icon}
                size={22}
              />
              <span>{name}</span>
            </Link>
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
        <div className="gentle-toast" role="status" aria-live="polite">
          <Icon name="spa" size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
