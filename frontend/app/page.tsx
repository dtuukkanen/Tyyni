"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName, TyyniLogo } from "./components/icons";
import { type SoundPreset, soundEngine } from "./components/soundEngine";

type Tab = "Today" | "Ground" | "Wins" | "Anchor";

type DashboardData = {
  displayName?: string;
  dateLabel?: string;
  mood?: string;
  steps?: { label: string; complete?: boolean }[];
  wins?: string[];
};

type MoodOption = {
  id: string;
  label: string;
  icon: IconName;
  response: string;
};

type PracticeModalState = {
  mode: "breath" | "sensory";
  category: string;
  title: string;
  description: string;
  icon: IconName;
  tips?: string[];
};

type AnchorItem = {
  id: string;
  tag: string;
  title: string;
  desc: string;
  meta: string;
  button: string;
  icon: IconName;
  tone: "tone-moss" | "tone-eucalyptus" | "tone-blush";
  guideDesc: string;
};

const TABS: { name: Tab; icon: IconName }[] = [
  { name: "Today", icon: "sun" },
  { name: "Ground", icon: "spa" },
  { name: "Wins", icon: "heart" },
  { name: "Anchor", icon: "anchor" },
];

const MOOD_OPTIONS: MoodOption[] = [
  {
    id: "Tired",
    label: "Tired",
    icon: "droplet",
    response: "Tired is noted. Wrap yourself in quiet — today asks only for soft rest.",
  },
  {
    id: "Tender",
    label: "Tender",
    icon: "sprout",
    response: "A bit tender is felt. Move with gentle kindness around yourself right now.",
  },
  {
    id: "Steady",
    label: "Steady",
    icon: "stone",
    response: "Steady is selected. That is more than enough for today.",
  },
  {
    id: "Light",
    label: "Light",
    icon: "sun",
    response: "Clear and light is embraced. Enjoy the quiet ease of this moment.",
  },
];

const STARTER_STEPS = [
  "Open curtains to let in morning light",
  "Drink a tall glass of cool water",
  "Step outside or look at the sky for 1 minute",
];

const STEP_ICONS: IconName[] = ["twilight", "waterGlass", "cloud", "spa"];

const CIRCLE_MEMBERS = [
  { initial: "L", name: "Liam", status: "Done", done: true, tone: "tone-moss" },
  {
    initial: "M",
    name: "Maya",
    status: "Done",
    done: true,
    tone: "tone-eucalyptus",
  },
  {
    initial: "S",
    name: "Sofia",
    status: "Resting",
    done: false,
    tone: "tone-linen",
  },
  {
    initial: "M",
    name: "Marcus",
    status: "Done",
    done: true,
    tone: "tone-blush",
  },
] as const;

const WIN_SUGGESTIONS: { label: string; icon: IconName }[] = [
  { label: "Drank water", icon: "tree" },
  { label: "Took 3 slow breaths", icon: "meditate" },
  { label: "Stretched my neck", icon: "spa" },
  { label: "Ate something nourishing", icon: "sun" },
  { label: "Said no to pressure", icon: "heart" },
  { label: "Rested without guilt", icon: "spa" },
];

const SENSORY_STEPS = [
  {
    count: 5,
    sense: "See",
    prompt: "Name five quiet things in your field of view",
    detail:
      "Notice soft light on a wall, the grain of a table, a plant leaf, or a shadow resting still.",
  },
  {
    count: 4,
    sense: "Touch",
    prompt: "Feel four physical textures against your skin",
    detail:
      "Notice the weight of fabric on your shoulders, your feet on the floor, or the warmth of your palms.",
  },
  {
    count: 3,
    sense: "Hear",
    prompt: "Listen for three ambient sounds nearby or far away",
    detail:
      "Let sounds pass without labeling them good or bad — wind outside, distant hum, or your own breath.",
  },
  {
    count: 2,
    sense: "Smell",
    prompt: "Notice two gentle scents in the air around you",
    detail:
      "Tea, fresh air from a window, clean linen, or simply the neutral coolness of the room.",
  },
  {
    count: 1,
    sense: "Taste",
    prompt: "Bring awareness to one sensation in your mouth",
    detail:
      "Take a sip of water or let your tongue rest softly away from the roof of your mouth.",
  },
];

const INITIAL_ANCHORS: AnchorItem[] = [
  {
    id: "blanket",
    tag: "Tactile · Proprioception",
    title: "The Heavy Blanket & Warm Tea",
    desc: "Deep pressure input over knees and shoulders. Gentle warmth against the palms to stimulate parasympathetic calming.",
    meta: "Recommended: 10 mins",
    button: "Hold Anchor",
    icon: "moon",
    tone: "tone-moss",
    guideDesc:
      "Drape a heavy blanket across your shoulders or lap. Cup something warm between both palms and let your shoulders drop.",
  },
  {
    id: "water",
    tag: "Thermal · Vagal Tone",
    title: "Cool Water on Wrists",
    desc: "Run cool tap water over inside wrists for 45 seconds or press a chilled compress against your forehead to activate the dive reflex.",
    meta: "Immediate physiological brake",
    button: "Step-by-step",
    icon: "droplet",
    tone: "tone-eucalyptus",
    guideDesc:
      "Turn on cool tap water. Hold the insides of both wrists beneath the gentle stream for 45 seconds while breathing out slowly.",
  },
];

const BREATH_PHASES = [
  { label: "Inhale", cue: "Softly through the nose", expand: true },
  { label: "Hold", cue: "Let the air settle", expand: true },
  { label: "Exhale", cue: "Unclench jaw & shoulders", expand: false },
  { label: "Rest", cue: "Quiet pause at the bottom", expand: false },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("Today");
  const [guestName, setGuestName] = useState("Elena");
  const [dateLabel, setDateLabel] = useState("Wednesday, October 24");
  const [lowEnergy, setLowEnergy] = useState(false);

  const [mood, setMood] = useState("Steady");
  const [steps, setSteps] = useState<string[]>(STARTER_STEPS);
  const [checked, setChecked] = useState<number[]>([0]);
  const [addingStep, setAddingStep] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [waveSent, setWaveSent] = useState(false);

  const [wins, setWins] = useState<string[]>([
    "Drank a glass of water",
    "Stepped away from screen",
    "Breathed through tension",
    "Left bed despite fatigue",
  ]);
  const [winInput, setWinInput] = useState("");

  const [anchors, setAnchors] = useState<AnchorItem[]>(INITIAL_ANCHORS);
  const [favoritedIds, setFavoritedIds] = useState<string[]>(["blanket"]);
  const [phraseCount, setPhraseCount] = useState(4);
  const [addingAnchor, setAddingAnchor] = useState(false);
  const [anchorTitle, setAnchorTitle] = useState("");
  const [anchorCategory, setAnchorCategory] = useState("Scent · Safe Memory");
  const [anchorDesc, setAnchorDesc] = useState("");

  const [activeSound, setActiveSound] = useState<SoundPreset | null>(null);
  const [modal, setModal] = useState<PracticeModalState | null>(null);
  const [breathIndex, setBreathIndex] = useState(0);
  const [sensoryIndex, setSensoryIndex] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/prototype")
      .then((r) => r.json())
      .then((data) => {
        if (data?.dashboard) {
          const next = data.dashboard as DashboardData;
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
        }
      })
      .catch(() => undefined);

    return () => {
      soundEngine.stop();
    };
  }, []);

  useEffect(() => {
    if (!modal || modal.mode !== "breath") return;
    setBreathIndex(0);
    const timer = window.setInterval(() => {
      setBreathIndex((prev) => (prev + 1) % BREATH_PHASES.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [modal]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? "" : current));
    }, 2800);
  }

  function toggleStep(index: number) {
    setChecked((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }

  function handleAddStep(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newStep.trim();
    if (!trimmed) return;
    setSteps((prev) => [...prev, trimmed]);
    setNewStep("");
    setAddingStep(false);
    notify("Added a gentle step for today.");
  }

  function addWinToJar(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    setWins((prev) => [trimmed, ...prev]);
    notify(`Placed “${trimmed}” in your Sanctuary Jar.`);
  }

  function handleWinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!winInput.trim()) return;
    addWinToJar(winInput);
    setWinInput("");
  }

  function handleSoundToggle(preset: SoundPreset, label: string) {
    const next = soundEngine.toggle(preset);
    setActiveSound(next);
    if (next) {
      notify(`Playing ${label} — tap again anytime to pause.`);
    }
  }

  function speakPhrase() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(
        "This feeling is a wave. I am the shore.",
      );
      utter.rate = 0.82;
      utter.pitch = 0.95;
      window.speechSynthesis.speak(utter);
    }
    notify("“This feeling is a wave. I am the shore.”");
  }

  function handleCreateAnchor(e: React.FormEvent) {
    e.preventDefault();
    if (!anchorTitle.trim()) return;
    const created: AnchorItem = {
      id: `custom-${Date.now()}`,
      tag: anchorCategory,
      title: anchorTitle.trim(),
      desc:
        anchorDesc.trim() ||
        "A personal sensory tether chosen to bring warmth and steadiness back into your body.",
      meta: "Personal tether",
      button: "Hold Anchor",
      icon: "spa",
      tone: "tone-moss",
      guideDesc:
        anchorDesc.trim() ||
        "Pause for three slow breaths while holding your attention gently on this anchor.",
    };
    setAnchors((prev) => [...prev, created]);
    setFavoritedIds((prev) => [...prev, created.id]);
    setAnchorTitle("");
    setAnchorDesc("");
    setAddingAnchor(false);
    notify(`Saved “${created.title}” to your Core Anchors.`);
  }

  const selectedMood =
    MOOD_OPTIONS.find((m) => m.id === mood) ?? MOOD_OPTIONS[2];
  const visibleSteps = lowEnergy ? steps.slice(0, 1) : steps;
  const activeBreath = BREATH_PHASES[breathIndex];
  const activeSense = SENSORY_STEPS[sensoryIndex];

  return (
    <div className="tyyni-shell">
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
            className="profile-btn"
            aria-label={`${guestName}'s calm settings`}
            onClick={() =>
              notify(`Signed in gently as ${guestName} · Quiet notifications`)
            }
          >
            <span className="profile-avatar">
              <Icon name="user" size={18} />
            </span>
          </button>
        </div>
      </header>

      {/* TODAY SCREEN */}
      {tab === "Today" && (
        <main className="screen-body">
          <div className="hero-header">
            <div className="top-meta-row">
              <span className="date-pill">{dateLabel}</span>
              <button
                type="button"
                className={`low-energy-btn ${lowEnergy ? "is-active" : ""}`}
                aria-pressed={lowEnergy}
                onClick={() => setLowEnergy((v) => !v)}
              >
                <Icon name="lowEnergy" size={16} />
                <span>Low-Energy Mode</span>
              </button>
            </div>

            <h1 className="hero-title">Good morning, {guestName}.</h1>
            <p className="hero-subtitle">
              Take a slow breath. You don’t have to carry tomorrow today.
            </p>
          </div>

          {lowEnergy && (
            <div className="low-energy-banner" role="status">
              <Icon name="spa" size={20} />
              <div>
                <strong>Low-energy sanctuary is active</strong>
                Everything extra has stepped aside. Focusing on one gentle step
                — or resting completely — is enough.
              </div>
            </div>
          )}

          {/* Somatic State Check-In */}
          <section
            className="section-block"
            aria-labelledby="checkin-heading"
          >
            <div className="section-header-row">
              <h2 id="checkin-heading" className="section-label">
                How are you arriving today?
              </h2>
            </div>

            <div className="mood-grid" role="group" aria-label="Somatic arrival state">
              {MOOD_OPTIONS.map((option) => {
                const isSelected = mood === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    className={`mood-chip ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setMood(option.id)}
                  >
                    <span className="mood-icon-wrap">
                      <Icon name={option.icon} size={15} />
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="mood-response" aria-live="polite">
              <Icon name="checkCircle" size={17} />
              <span>{selectedMood.response}</span>
            </p>
          </section>

          {/* Tiny Steps for Today */}
          <section
            className="section-block"
            aria-labelledby="tiny-steps-heading"
          >
            <div className="section-header-row">
              <h2 id="tiny-steps-heading" className="section-label">
                <span>Tiny Steps for Today</span>
                <span className="status-dot" aria-hidden="true" />
              </h2>
              <span className="section-meta">No streaks · No penalties</span>
            </div>

            <div className="steps-stack">
              {visibleSteps.map((step, index) => {
                const isDone = checked.includes(index);
                const iconName = STEP_ICONS[index % STEP_ICONS.length];
                return (
                  <button
                    key={`${step}-${index}`}
                    type="button"
                    className={`step-card ${isDone ? "is-done" : ""}`}
                    aria-pressed={isDone}
                    onClick={() => toggleStep(index)}
                  >
                    <span className="step-check">
                      <Icon name="check" size={16} />
                    </span>
                    <span className="step-text">{step}</span>
                    <span className="step-trailing-icon">
                      <Icon name={iconName} size={20} />
                    </span>
                  </button>
                );
              })}
            </div>

            {lowEnergy && steps.length > 1 && (
              <button
                type="button"
                className="soft-add-trigger"
                onClick={() => setLowEnergy(false)}
              >
                <span>Show {steps.length - 1} more optional steps</span>
              </button>
            )}

            {!addingStep ? (
              <button
                type="button"
                className="soft-add-trigger"
                onClick={() => setAddingStep(true)}
              >
                <Icon name="plus" size={18} />
                <span>Add one small thing (optional)</span>
              </button>
            ) : (
              <form className="capsule-form" onSubmit={handleAddStep}>
                <label htmlFor="new-step-input" className="sr-only">
                  Add one small step for today
                </label>
                <input
                  id="new-step-input"
                  className="capsule-input"
                  type="text"
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  placeholder="One gentle intention (e.g., sip warm tea)..."
                  autoFocus
                />
                <button
                  type="submit"
                  className="capsule-submit"
                  aria-label="Save small step"
                >
                  <Icon name="plus" size={18} />
                </button>
              </form>
            )}
          </section>

          {/* Gentle Circle */}
          <section className="circle-pod" aria-labelledby="circle-heading">
            <div className="section-header-row">
              <h2 id="circle-heading" className="section-label">
                <Icon name="users" size={19} />
                <span>Gentle Circle</span>
              </h2>
              <span className="section-meta">3 checked in today</span>
            </div>

            <p className="circle-subcopy">
              Quietly present together. No pressure, just mutual care.
            </p>

            <div className="circle-grid">
              {CIRCLE_MEMBERS.map((person) => (
                <div key={person.name} className="member-card">
                  <div className="member-avatar-wrap">
                    <div className={`member-avatar ${person.tone}`}>
                      {person.initial}
                    </div>
                    {person.done && (
                      <span className="member-badge" aria-hidden="true">
                        <Icon name="check" size={11} />
                      </span>
                    )}
                  </div>
                  <span className="member-name">{person.name}</span>
                  <span
                    className={`member-status ${person.done ? "is-done" : ""}`}
                  >
                    {person.done && <Icon name="checkCircle" size={12} />}
                    <span>{person.status}</span>
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={`wave-btn ${waveSent ? "is-sent" : ""}`}
              onClick={() => {
                setWaveSent(true);
                notify("Sent a quiet wave to Liam, Maya, Sofia, and Marcus.");
              }}
            >
              <Icon name="wave" size={17} />
              <span>
                {waveSent ? "Gentle wave sent" : "Send a gentle wave"}
              </span>
            </button>
          </section>
        </main>
      )}

      {/* GROUND SCREEN */}
      {tab === "Ground" && (
        <main className="screen-body">
          <div className="hero-header">
            <span className="eyebrow-badge">
              <Icon name="spa" size={14} />
              <span>SOMATIC ANCHOR</span>
            </span>
            <h1 className="hero-title">Ground yourself.</h1>
            <p className="hero-subtitle">
              Choose one gentle practice. No rush, no expectations.
            </p>

            <div className="reassure-banner">
              <span className="icon-orb icon-orb-round tone-eucalyptus">
                <Icon name="twilight" size={20} />
              </span>
              <div className="reassure-copy">
                <strong>Your pace is worthy</strong>
                <span>
                  Even closing your eyes for 30 seconds rewires the nervous
                  system.
                </span>
              </div>
            </div>
          </div>

          <section
            className="practices-stack"
            aria-label="Grounding practices"
          >
            {/* 1. Box Breathing */}
            <article className="practice-card">
              <div className="practice-top">
                <div className="practice-lead">
                  <span className="icon-orb tone-moss">
                    <Icon name="air" size={22} />
                  </span>
                  <div>
                    <h2 className="practice-title">Box Breathing</h2>
                    <p className="practice-desc">
                      Calm nervous system · Inhale, hold, exhale, rest
                    </p>
                  </div>
                </div>
                <span className="duration-pill">2 mins</span>
              </div>
              <div className="practice-footer">
                <span className="practice-note">
                  <Icon name="infinity" size={16} />
                  <span>Biomorphic balance</span>
                </span>
                <button
                  type="button"
                  className="btn-primary-pill"
                  onClick={() =>
                    setModal({
                      mode: "breath",
                      category: "Breath Rhythm",
                      title: "Box Breathing",
                      description:
                        "Follow the soothing expansion. There is no right or wrong rhythm.",
                      icon: "air",
                    })
                  }
                >
                  Begin
                </button>
              </div>
            </article>

            {/* 2. Sound Sanctuary */}
            <article className="practice-card">
              <div className="practice-top">
                <div className="practice-lead">
                  <span className="icon-orb tone-linen">
                    <Icon name="waves" size={22} />
                  </span>
                  <div>
                    <h2 className="practice-title">Sound Sanctuary</h2>
                    <p className="practice-desc">
                      Ambient rainfall, forest stream, singing bowl
                    </p>
                  </div>
                </div>
                <span className="duration-pill">5 mins</span>
              </div>
              <div className="practice-footer">
                <span className="practice-note">
                  <span
                    className={`wave-bars ${
                      activeSound === "sanctuary" ? "is-playing" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                  <span>Warm acoustic hum</span>
                </span>
                <button
                  type="button"
                  className={`btn-secondary-pill ${
                    activeSound === "sanctuary" ? "is-active" : ""
                  }`}
                  onClick={() =>
                    handleSoundToggle("sanctuary", "Sound Sanctuary")
                  }
                >
                  <Icon
                    name={activeSound === "sanctuary" ? "pause" : "play"}
                    size={15}
                  />
                  <span>
                    {activeSound === "sanctuary" ? "Playing" : "Listen"}
                  </span>
                </button>
              </div>
            </article>

            {/* 3. Nearby Nature */}
            <article className="practice-card">
              <div className="practice-top">
                <div className="practice-lead">
                  <span className="icon-orb tone-moss">
                    <Icon name="forest" size={22} />
                  </span>
                  <div>
                    <h2 className="practice-title">Nearby nature</h2>
                    <p className="practice-desc">
                      Quiet shaded trees, lake shores, riverbank, or open grass
                    </p>
                  </div>
                </div>
                <span className="duration-pill is-moss">0.8 km</span>
              </div>

              <div className="nature-map-card">
                <svg
                  className="nature-map-svg"
                  viewBox="0 0 360 110"
                  preserveAspectRatio="xMidYMid slice"
                  role="img"
                  aria-label="Illustration of Linden Grove and Lakeside Haven path"
                >
                  <rect width="360" height="110" fill="#d9eee2" />
                  <path
                    d="M0 78 C68 58, 125 90, 198 68 C260 49, 312 65, 360 48 L360 110 L0 110 Z"
                    fill="#b8dec9"
                  />
                  <path
                    d="M210 0 C235 34, 275 46, 360 40 L360 0 Z"
                    fill="#bce0ea"
                  />
                  <path
                    d="M24 96 Q 112 46, 198 62 T 334 26"
                    fill="none"
                    stroke="#fbf9f6"
                    strokeWidth="3.5"
                    strokeDasharray="6 5"
                    strokeLinecap="round"
                  />
                  <circle cx="76" cy="42" r="14" fill="#9ccfB0" />
                  <circle cx="96" cy="36" r="11" fill="#88c29f" />
                  <circle cx="156" cy="32" r="15" fill="#9ccfB0" />
                  <circle cx="198" cy="62" r="7" fill="#3a6057" />
                  <circle
                    cx="198"
                    cy="62"
                    r="13"
                    fill="#3a6057"
                    fillOpacity="0.22"
                  />
                </svg>
                <div className="nature-map-caption">
                  <Icon name="pin" size={15} />
                  <span>Linden Grove &amp; Lakeside Haven (8 min gentle walk)</span>
                </div>
              </div>

              <div className="practice-footer">
                <span className="practice-note">
                  Open benches · Low foot traffic · Calming water
                </span>
                <button
                  type="button"
                  className="btn-secondary-pill"
                  onClick={() =>
                    setModal({
                      mode: "breath",
                      category: "Nature Connection",
                      title: "Linden Grove Sanctuary",
                      description:
                        "Step outside whenever you feel ready. Watching leaves move in the wind naturally softens cortisol.",
                      icon: "forest",
                      tips: [
                        "8 min level walk along shaded gravel",
                        "Quiet lakeside benches facing west",
                      ],
                    })
                  }
                >
                  Explore
                </button>
              </div>
            </article>

            {/* 4. Gentle Body Scan */}
            <article className="practice-card">
              <div className="practice-top">
                <div className="practice-lead">
                  <span className="icon-orb tone-eucalyptus">
                    <Icon name="meditate" size={22} />
                  </span>
                  <div>
                    <h2 className="practice-title">Gentle Body Scan</h2>
                    <p className="practice-desc">
                      Unclench jaw, soften shoulders, release hands
                    </p>
                  </div>
                </div>
                <span className="duration-pill">3 mins</span>
              </div>
              <div className="practice-footer">
                <span className="practice-note">
                  <span className="status-dot" aria-hidden="true" />
                  <span>Seated or lying down</span>
                </span>
                <button
                  type="button"
                  className="btn-primary-pill"
                  onClick={() =>
                    setModal({
                      mode: "breath",
                      category: "Quiet Unwinding",
                      title: "Gentle Body Softening",
                      description:
                        "Let your tongue rest away from the roof of your mouth. Drop your shoulders down an inch.",
                      icon: "meditate",
                    })
                  }
                >
                  Begin
                </button>
              </div>
            </article>

            {/* 5. Gentle Mat Stretch */}
            <article className="practice-card">
              <div className="practice-top">
                <div className="practice-lead">
                  <span className="icon-orb tone-blush">
                    <Icon name="bed" size={22} />
                  </span>
                  <div>
                    <h2 className="practice-title">Gentle Mat Stretch</h2>
                    <p className="practice-desc">
                      Bed or soft rug · Child’s pose &amp; resting twist
                    </p>
                  </div>
                </div>
                <span className="duration-pill">5 mins</span>
              </div>
              <div className="practice-footer">
                <span className="practice-note">
                  Zero sweat · Heavy pillows encouraged
                </span>
                <button
                  type="button"
                  className="btn-secondary-pill"
                  onClick={() =>
                    setModal({
                      mode: "breath",
                      category: "Comfort First",
                      title: "Restorative Mat Rest",
                      description:
                        "Fold over a pillow in wide-knee child’s pose, then rest on your side with knees supported.",
                      icon: "bed",
                    })
                  }
                >
                  View Poses
                </button>
              </div>
            </article>

            {/* 6. Mindful Slow Walk */}
            <article className="practice-card">
              <div className="practice-top">
                <div className="practice-lead">
                  <span className="icon-orb tone-moss">
                    <Icon name="walk" size={22} />
                  </span>
                  <div>
                    <h2 className="practice-title">Mindful Slow Walk</h2>
                    <p className="practice-desc">
                      Just feeling your feet contact the floor
                    </p>
                  </div>
                </div>
                <span className="duration-pill">10 mins</span>
              </div>
              <div className="practice-footer">
                <span className="practice-note">
                  Indoor socks or outdoor stroll
                </span>
                <button
                  type="button"
                  className="btn-secondary-pill"
                  onClick={() =>
                    setModal({
                      mode: "breath",
                      category: "Tactile Presence",
                      title: "Slow Grounding Walk",
                      description:
                        "Notice the heel touch, the roll across the sole, and the lift. There is nowhere to hurry.",
                      icon: "walk",
                    })
                  }
                >
                  Begin
                </button>
              </div>
            </article>
          </section>

          <div className="section-block">
            <div className="reassure-footnote">
              <Icon name="verified" size={20} />
              <span>
                Doing even <strong>30 seconds</strong> counts as a full
                practice. Showing up for your breath is already enough.
              </span>
            </div>

            <button
              type="button"
              className="sos-pill-btn"
              onClick={() =>
                setModal({
                  mode: "breath",
                  category: "Emergency Calm",
                  title: "Deep Calming Sigh",
                  description:
                    "Take two soft sips of air in through your nose, followed by a long, unhurried sigh out your mouth.",
                  icon: "heartFilled",
                })
              }
            >
              <Icon name="sos" size={20} />
              <span>Need immediate calm? 1-Tap SOS Breathing</span>
            </button>
          </div>
        </main>
      )}

      {/* WINS SCREEN */}
      {tab === "Wins" && (
        <main className="screen-body">
          <div className="hero-header">
            <span className="eyebrow-badge">
              <Icon name="heartFilled" size={13} />
              <span>MICRO-VICTORIES</span>
            </span>
            <h1 className="hero-title hero-title-green">Gentle Wins.</h1>
            <p className="hero-subtitle">
              Nothing is too small. Surviving a hard moment, resting, or
              drinking water is already a triumph.
            </p>

            <div className="reassure-banner">
              <span className="icon-orb icon-orb-round tone-moss">
                <Icon name="tree" size={20} />
              </span>
              <div className="reassure-copy">
                <strong>No scoreboards here</strong>
                <span>
                  Wins are not tallied for productivity, but gathered gently as
                  soft proof of kindness to yourself.
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
                  onClick={() => addWinToJar(item.label)}
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
                <span
                  className="status-dot"
                  style={{ background: "var(--outline)" }}
                  aria-hidden="true"
                />
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
            <span className="icon-orb icon-orb-round" style={{ background: "#fff", color: "var(--secondary)" }}>
              <Icon name="meditate" size={20} />
            </span>
            <p className="affirmation-quote">
              “You do not need to earn your rest.”
            </p>
            <p className="affirmation-sub">
              Return to these soft reflections whenever overwhelm strikes. You
              are doing enough simply by breathing.
            </p>
          </section>
        </main>
      )}

      {/* ANCHOR SCREEN */}
      {tab === "Anchor" && (
        <main className="screen-body">
          <div className="hero-header">
            <span className="eyebrow-badge">
              <span className="status-dot" aria-hidden="true" />
              <span>SOMATIC STABILIZERS</span>
            </span>
            <h1 className="hero-title">Your Anchors.</h1>
            <p className="hero-subtitle">
              Familiar tethers to bring you back into your body when overwhelm
              strikes.
            </p>
          </div>

          {/* 5-4-3-2-1 Sensory Reset */}
          <section className="sensory-reset-card">
            <div className="practice-top">
              <div>
                <span className="kicker-text">Quick Grounding</span>
                <h2 className="practice-title" style={{ marginTop: 4 }}>
                  Sensory 5–4–3–2–1 Reset
                </h2>
              </div>
              <span className="icon-orb icon-orb-round tone-moss">
                <Icon name="flower" size={20} />
              </span>
            </div>

            <p className="practice-desc" style={{ margin: 0 }}>
              Shift activation away from racing thoughts into present physical
              stimuli.
            </p>

            <div className="senses-row">
              {SENSORY_STEPS.map((item, idx) => (
                <button
                  key={item.sense}
                  type="button"
                  className="sense-pill"
                  onClick={() => {
                    setSensoryIndex(idx);
                    setModal({
                      mode: "sensory",
                      category: "5–4–3–2–1 Grounding",
                      title: "Present Senses Tether",
                      description:
                        "Move gently through each sense at your own pace.",
                      icon: "flower",
                    });
                  }}
                >
                  <span className="sense-num">{item.count}</span>
                  <span className="sense-label">{item.sense}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn-primary-pill btn-full"
              onClick={() => {
                setSensoryIndex(0);
                setModal({
                  mode: "sensory",
                  category: "5–4–3–2–1 Grounding",
                  title: "Present Senses Tether",
                  description:
                    "Move gently through each sense at your own pace.",
                  icon: "flower",
                });
              }}
            >
              <Icon name="play" size={15} />
              <span>Begin Gentle Guide (90s)</span>
            </button>
          </section>

          {/* My Core Anchors */}
          <section
            className="section-block"
            aria-labelledby="core-anchors-heading"
          >
            <div className="section-header-row">
              <h2 id="core-anchors-heading" className="section-heading">
                My Core Anchors
              </h2>
              <span className="section-meta">{anchors.length + 2} Active</span>
            </div>

            {anchors.map((anchor) => {
              const isFav = favoritedIds.includes(anchor.id);
              return (
                <article key={anchor.id} className="anchor-card">
                  <div className="anchor-meta-bar">
                    <div className="anchor-tag-group">
                      <span className={`anchor-mini-orb ${anchor.tone}`}>
                        <Icon name={anchor.icon} size={15} />
                      </span>
                      <span className="anchor-tag-pill">{anchor.tag}</span>
                    </div>
                    <button
                      type="button"
                      className={`icon-action-btn ${isFav ? "is-favorited" : ""}`}
                      aria-label={
                        isFav
                          ? `Remove ${anchor.title} from favorites`
                          : `Save ${anchor.title} to favorites`
                      }
                      aria-pressed={isFav}
                      onClick={() =>
                        setFavoritedIds((prev) =>
                          prev.includes(anchor.id)
                            ? prev.filter((id) => id !== anchor.id)
                            : [...prev, anchor.id],
                        )
                      }
                    >
                      <Icon name={isFav ? "heartFilled" : "heart"} size={19} />
                    </button>
                  </div>

                  <div>
                    <h3 className="practice-title">{anchor.title}</h3>
                    <p className="practice-desc">{anchor.desc}</p>
                  </div>

                  <div className="anchor-divider-foot">
                    <span className="section-meta">{anchor.meta}</span>
                    <button
                      type="button"
                      className="btn-secondary-pill"
                      onClick={() =>
                        setModal({
                          mode: "breath",
                          category: anchor.tag,
                          title: anchor.title,
                          description: anchor.guideDesc,
                          icon: anchor.icon,
                        })
                      }
                    >
                      <Icon name="tap" size={16} />
                      <span>{anchor.button}</span>
                    </button>
                  </div>
                </article>
              );
            })}

            {/* Elena's Grounding Phrase */}
            <article className="anchor-card is-linen">
              <div className="anchor-meta-bar">
                <div className="anchor-tag-group">
                  <span className="anchor-mini-orb tone-blush">
                    <Icon name="voice" size={15} />
                  </span>
                  <span className="anchor-tag-pill">
                    {guestName}’s Grounding Phrase
                  </span>
                </div>
                <span className="section-meta">
                  Repetition {phraseCount}/5
                </span>
              </div>

              <blockquote className="phrase-blockquote">
                “This feeling is a wave. I am the shore.”
              </blockquote>

              <div className="practice-footer">
                <span className="practice-note">Tap rhythmically to ground</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="round-action-btn"
                    aria-label="Listen to grounding phrase"
                    onClick={speakPhrase}
                  >
                    <Icon name="volume" size={18} />
                  </button>
                  <button
                    type="button"
                    className="round-action-btn"
                    aria-label="Count one slow phrase repetition"
                    onClick={() => {
                      setPhraseCount((prev) => {
                        const next = prev >= 5 ? 1 : prev + 1;
                        if (next === 5) {
                          notify("5 gentle repetitions completed. Stay steady.");
                        }
                        return next;
                      });
                    }}
                  >
                    <Icon name="tap" size={18} />
                  </button>
                </div>
              </div>
            </article>

            {/* Vibroacoustic Brown Noise Anchor */}
            <article className="anchor-card">
              <div className="anchor-meta-bar">
                <div className="anchor-tag-group">
                  <span className="anchor-mini-orb tone-moss">
                    <Icon name="equalizer" size={16} />
                  </span>
                  <span className="anchor-tag-pill">Acoustic · Frequency</span>
                </div>
                <span className="section-meta" style={{ color: "var(--primary)" }}>
                  ● 24–30Hz Vibroacoustic
                </span>
              </div>

              <div className="practice-footer">
                <div>
                  <h3 className="practice-title">
                    Deep Cat Purr &amp; Brown Noise
                  </h3>
                  <p className="practice-desc">
                    Rhythmic low frequencies that relax the spine.
                  </p>
                </div>
                <button
                  type="button"
                  className={`round-action-btn ${
                    activeSound === "purr" ? "is-active" : ""
                  }`}
                  style={{
                    background:
                      activeSound === "purr"
                        ? "var(--primary)"
                        : "var(--primary-container)",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                  aria-label={
                    activeSound === "purr"
                      ? "Pause brown noise anchor"
                      : "Play brown noise anchor"
                  }
                  onClick={() =>
                    handleSoundToggle("purr", "Vibroacoustic Brown Noise")
                  }
                >
                  <Icon
                    name={activeSound === "purr" ? "pause" : "play"}
                    size={18}
                  />
                </button>
              </div>
            </article>
          </section>

          {/* Emergency Tether */}
          <section className="emergency-tether-card">
            <span className="emergency-kicker">
              <Icon name="sos" size={18} />
              <span>Emergency Tether</span>
            </span>
            <h2 className="practice-title">Panic or High Distress Support</h2>
            <p className="practice-desc" style={{ margin: 0 }}>
              If your nervous system is in full freeze or acute flight, these
              three actions trigger immediate biological downregulation.
            </p>

            <div className="emergency-row">
              <div className="emergency-row-lead">
                <Icon name="air" size={20} />
                <div>
                  <p className="emergency-row-title">The Double Inhale Sigh</p>
                  <p className="emergency-row-desc">
                    2 quick inhales through nose, slow long sigh out.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary-pill"
                onClick={() =>
                  setModal({
                    mode: "breath",
                    category: "Physiological Sigh",
                    title: "The Double Inhale Sigh",
                    description:
                      "Sip air in twice through the nose to gently open the lungs, then release one long, unhurried sigh out.",
                    icon: "air",
                  })
                }
              >
                Guide
              </button>
            </div>

            <div className="emergency-row">
              <div className="emergency-row-lead">
                <Icon name="phone" size={20} />
                <div>
                  <p className="emergency-row-title">Call Safe Person</p>
                  <p className="emergency-row-desc">
                    Mama (Direct bypass to speakerphone)
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary-pill"
                style={{
                  background: "var(--tertiary-fixed)",
                  color: "var(--on-tertiary-fixed)",
                }}
                onClick={() =>
                  notify("Ready to connect to Mama on speakerphone.")
                }
              >
                Connect
              </button>
            </div>

            <div className="emergency-row" style={{ background: "rgba(255,255,255,0.58)" }}>
              <div className="emergency-row-lead">
                <Icon name="snowflake" size={20} />
                <p className="emergency-row-desc" style={{ margin: 0 }}>
                  Alternative: Submerge lower face into a bowl of ice-cold water
                  for 15 seconds.
                </p>
              </div>
            </div>
          </section>

          {/* Add Sensory Anchor */}
          {!addingAnchor ? (
            <button
              type="button"
              className="dashed-add-anchor"
              onClick={() => setAddingAnchor(true)}
            >
              <Icon name="plus" size={18} />
              <span>Add a sensory anchor (scent, sound, person, place)</span>
            </button>
          ) : (
            <form className="anchor-composer" onSubmit={handleCreateAnchor}>
              <div className="section-header-row">
                <h3 className="practice-title">New Personal Anchor</h3>
                <button
                  type="button"
                  className="icon-action-btn"
                  aria-label="Cancel adding anchor"
                  onClick={() => setAddingAnchor(false)}
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
              <div className="composer-field">
                <label htmlFor="anchor-title">Anchor name</label>
                <input
                  id="anchor-title"
                  className="composer-input"
                  type="text"
                  value={anchorTitle}
                  onChange={(e) => setAnchorTitle(e.target.value)}
                  placeholder="e.g., Cedarwood oil on wrists"
                  required
                />
              </div>
              <div className="composer-field">
                <label htmlFor="anchor-cat">Sensory channel</label>
                <select
                  id="anchor-cat"
                  className="composer-input"
                  value={anchorCategory}
                  onChange={(e) => setAnchorCategory(e.target.value)}
                >
                  <option value="Scent · Safe Memory">Scent · Safe Memory</option>
                  <option value="Tactile · Comfort">Tactile · Comfort</option>
                  <option value="Acoustic · Calm">Acoustic · Calm</option>
                  <option value="Place · Sanctuary">Place · Sanctuary</option>
                </select>
              </div>
              <div className="composer-field">
                <label htmlFor="anchor-desc">Gentle note (optional)</label>
                <input
                  id="anchor-desc"
                  className="composer-input"
                  type="text"
                  value={anchorDesc}
                  onChange={(e) => setAnchorDesc(e.target.value)}
                  placeholder="How it helps your body settle..."
                />
              </div>
              <button type="submit" className="btn-primary-pill btn-full">
                Save to My Core Anchors
              </button>
            </form>
          )}

          {/* Gentle Reminder Footer */}
          <section className="affirmation-card is-neutral">
            <Icon name="spa" size={22} />
            <p className="affirmation-quote" style={{ color: "var(--ink)" }}>
              “You don’t have to fix everything right now. Just feeling the
              ground beneath you is enough.”
            </p>
            <span className="section-meta">— Tyyni Somatic Practice</span>
          </section>
        </main>
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
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div className="modal-sheet">
            <button
              type="button"
              className="modal-close-btn"
              aria-label="Close grounding guide"
              onClick={() => setModal(null)}
            >
              <Icon name="close" size={20} />
            </button>

            <span className="icon-orb icon-orb-round tone-moss">
              <Icon name={modal.icon} size={22} />
            </span>
            <span className="kicker-text">{modal.category}</span>
            <h2 id="modal-title" className="practice-title">
              {modal.title}
            </h2>
            <p className="practice-desc" style={{ margin: 0, maxWidth: "30ch" }}>
              {modal.description}
            </p>

            {modal.mode === "breath" ? (
              <>
                <div className="pacer-stage" aria-live="polite">
                  <div
                    className={`pacer-ring-outer ${
                      activeBreath.expand ? "phase-expand" : "phase-rest"
                    }`}
                  />
                  <div
                    className={`pacer-core ${
                      activeBreath.expand ? "phase-expand" : "phase-rest"
                    }`}
                  >
                    <span className="pacer-phase-label">
                      {activeBreath.label}
                    </span>
                    <span className="pacer-sub-label">{activeBreath.cue}</span>
                  </div>
                </div>
                {modal.tips && (
                  <div className="sensory-step-box">
                    {modal.tips.map((tip) => (
                      <span key={tip} className="practice-note">
                        <Icon name="checkCircle" size={15} />
                        <span>{tip}</span>
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="btn-secondary-pill btn-full"
                  onClick={() => setModal(null)}
                >
                  I’m grounded now
                </button>
              </>
            ) : (
              <>
                <div className="sensory-dots" aria-hidden="true">
                  {SENSORY_STEPS.map((s, idx) => (
                    <span
                      key={s.sense}
                      className={`sensory-dot ${
                        idx === sensoryIndex ? "is-current" : ""
                      }`}
                    />
                  ))}
                </div>
                <div className="sensory-step-box" aria-live="polite">
                  <span className="kicker-text">
                    {activeSense.count} · {activeSense.sense}
                  </span>
                  <strong style={{ fontSize: 16, color: "var(--ink)" }}>
                    {activeSense.prompt}
                  </strong>
                  <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
                    {activeSense.detail}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, width: "100%" }}>
                  {sensoryIndex < SENSORY_STEPS.length - 1 ? (
                    <button
                      type="button"
                      className="btn-primary-pill btn-full"
                      onClick={() => setSensoryIndex((i) => i + 1)}
                    >
                      Next sense ({SENSORY_STEPS[sensoryIndex + 1].count}{" "}
                      {SENSORY_STEPS[sensoryIndex + 1].sense})
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary-pill btn-full"
                      onClick={() => {
                        setModal(null);
                        notify("5–4–3–2–1 reset complete. Welcome back.");
                      }}
                    >
                      Complete gentle reset
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="gentle-toast" role="status" aria-live="polite">
          <Icon name="spa" size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
