import type { IconName } from "../components/icons";
import type { BackendAnomaly, BackendSuggestion } from "./behavioralNudges";

export type Tab = "Today" | "Ground" | "Wins" | "Journal" | "Anchor";

export type DashboardData = {
  userId?: string;
  displayName?: string;
  dateLabel?: string;
  mood?: string;
  steps?: { label: string; complete?: boolean }[];
  wins?: string[];
  anomalies?: BackendAnomaly[];
  suggestions?: BackendSuggestion[];
};

export type MoodOption = {
  id: string;
  label: string;
  icon: IconName;
  meaning: string;
};

export type BreathPhase = {
  label: string;
  cue: string;
  expand: boolean;
  /** How long the phase lasts; defaults to 3600 ms. */
  ms?: number;
};

export type PracticeGuideStep = {
  title: string;
  detail: string;
  icon?: IconName;
};

export type PracticeModalState = {
  mode: "breath" | "sensory" | "guide";
  category: string;
  title: string;
  description: string;
  icon: IconName;
  tips?: string[];
  /** Step-by-step visual cards for non-breathing practices (`mode: "guide"`). */
  steps?: PracticeGuideStep[];
  /** Optional countdown timer in seconds for `mode: "guide"`. */
  durationSeconds?: number;
  /** Custom pacing; falls back to the even four-phase BREATH_PHASES. */
  phases?: BreathPhase[];
};

export type AnchorItem = {
  id: string;
  tag: string;
  title: string;
  desc: string;
  meta: string;
  button: string;
  icon: IconName;
  tone: "tone-moss" | "tone-eucalyptus" | "tone-blush";
  guideDesc: string;
  guideSteps?: PracticeGuideStep[];
  durationSeconds?: number;
};

/** Each tab is its own route under app/(sanctuary)/. */
export const TABS: { name: Tab; icon: IconName; href: string }[] = [
  { name: "Today", icon: "sun", href: "/" },
  { name: "Ground", icon: "spa", href: "/ground" },
  { name: "Wins", icon: "heart", href: "/wins" },
  { name: "Journal", icon: "pen", href: "/journal" },
  { name: "Anchor", icon: "anchor", href: "/anchor" },
];

export function tabHref(tab: Tab): string {
  return TABS.find((t) => t.name === tab)?.href ?? "/";
}

export function tabForPath(pathname: string): Tab {
  return TABS.find((t) => t.href === pathname)?.name ?? "Today";
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    id: "Tired",
    label: "Tired",
    icon: "droplet",
    meaning: "Low battery. Your body or mind is asking for rest.",
  },
  {
    id: "Tender",
    label: "Tender",
    icon: "sprout",
    meaning: "A bit raw. Things land harder than usual.",
  },
  {
    id: "Steady",
    label: "Steady",
    icon: "stone",
    meaning: "Grounded enough. Nothing needs fixing right now.",
  },
  {
    id: "Light",
    label: "Light",
    icon: "sun",
    meaning: "Clear and open, with some ease or energy.",
  },
];

export const STARTER_STEPS = [
  "Open curtains to let in morning light",
  "Drink a tall glass of cool water",
  "Step outside or look at the sky for 1 minute",
];

export const STEP_ICONS: IconName[] = [
  "twilight",
  "waterGlass",
  "cloud",
  "spa",
];

/** Basic-needs steps shown instead of the usual list in low-energy mode. */
export const LOW_ENERGY_STEPS: { label: string; icon: IconName }[] = [
  { label: "Sip some water", icon: "waterGlass" },
  { label: "Eat something small. Anything counts.", icon: "sprout" },
  { label: "Close your eyes for two minutes", icon: "moon" },
];

export const LOW_ENERGY_BREATH: PracticeModalState = {
  mode: "breath",
  category: "Low-energy reset",
  title: "Slow exhale",
  description:
    "Breathe in softly, then let the out-breath run a little longer. A long exhale tells your body it’s safe to slow down.",
  icon: "air",
  phases: [
    { label: "Inhale", cue: "Softly, no effort", expand: true, ms: 4000 },
    {
      label: "Exhale",
      cue: "Long and slow, like a sigh",
      expand: false,
      ms: 6500,
    },
    { label: "Rest", cue: "Let the body be heavy", expand: false, ms: 2000 },
  ],
  tips: [
    "Stay lying down or slumped. No need to sit up straight.",
    "Stop whenever you like. One slow breath still counts.",
  ],
};

export type CircleMember = {
  initial: string;
  name: string;
  tone: "tone-moss" | "tone-eucalyptus" | "tone-linen" | "tone-blush";
  /** The mood id they checked in with, or null while they rest. */
  feeling: string | null;
  note: string;
  when: string;
};

export const CIRCLE_MEMBERS: CircleMember[] = [
  {
    initial: "L",
    name: "Liam",
    tone: "tone-moss",
    feeling: "Steady",
    note: "Stretched by the window before work",
    when: "8:10",
  },
  {
    initial: "M",
    name: "Maya",
    tone: "tone-eucalyptus",
    feeling: "Light",
    note: "Walked the long way home in the sun",
    when: "9:35",
  },
  {
    initial: "M",
    name: "Marcus",
    tone: "tone-blush",
    feeling: "Tender",
    note: "Breathed through a heavy morning",
    when: "10:20",
  },
  {
    initial: "S",
    name: "Sofia",
    tone: "tone-linen",
    feeling: null,
    note: "Taking a slow, quiet day",
    when: "",
  },
];

export const STARTER_WINS = [
  "Drank a glass of water",
  "Stepped away from screen",
  "Breathed through tension",
  "Left bed despite fatigue",
];

export const WIN_SUGGESTIONS: {
  label: string;
  icon: IconName;
  tone: "tone-moss" | "tone-eucalyptus" | "tone-blush" | "tone-linen";
}[] = [
  { label: "Drank water", icon: "waterGlass", tone: "tone-eucalyptus" },
  { label: "Slow breaths", icon: "air", tone: "tone-moss" },
  { label: "Stretched", icon: "walk", tone: "tone-moss" },
  { label: "Ate something", icon: "cup", tone: "tone-linen" },
  { label: "Set boundary", icon: "heart", tone: "tone-blush" },
  { label: "Rested", icon: "moon", tone: "tone-eucalyptus" },
];

export const SENSORY_STEPS: {
  count: number;
  sense: string;
  icon: IconName;
  prompt: string;
  detail: string;
}[] = [
  {
    count: 5,
    sense: "See",
    icon: "eye",
    prompt: "Spot five quiet things in view",
    detail: "Light on a wall, wood grain, a leaf, or a still shadow.",
  },
  {
    count: 4,
    sense: "Touch",
    icon: "tap",
    prompt: "Feel four textures against your skin",
    detail:
      "Fabric on your shoulders, feet on the floor, warmth in your hands.",
  },
  {
    count: 3,
    sense: "Hear",
    icon: "waves",
    prompt: "Notice three sounds nearby or far",
    detail: "Wind outside, a distant hum, or your own breathing.",
  },
  {
    count: 2,
    sense: "Smell",
    icon: "flower",
    prompt: "Catch two scents in the air",
    detail: "Tea, fresh air from a window, clean fabric, or cool room air.",
  },
  {
    count: 1,
    sense: "Taste",
    icon: "cup",
    prompt: "Notice one sensation in your mouth",
    detail: "Take a sip of water or unclench your jaw and rest your tongue.",
  },
];

export const INITIAL_ANCHORS: AnchorItem[] = [
  {
    id: "blanket",
    tag: "Touch",
    title: "Heavy Blanket & Tea",
    desc: "Weight over shoulders + warm mug in both hands",
    meta: "10 min",
    button: "Open",
    icon: "cup",
    tone: "tone-moss",
    guideDesc: "Steady warmth and gentle weight to help your body settle.",
    durationSeconds: 600,
    guideSteps: [
      {
        title: "Drape weight",
        detail: "Pull a heavy blanket or coat over your shoulders or lap.",
        icon: "bed",
      },
      {
        title: "Hold warmth",
        detail: "Cup a warm mug between both palms and notice the heat.",
        icon: "cup",
      },
      {
        title: "Drop shoulders",
        detail: "Unclench your jaw and lean back against support.",
        icon: "stone",
      },
    ],
  },
  {
    id: "water",
    tag: "Cool reset",
    title: "Cool Water on Wrists",
    desc: "Run cool tap water over inner wrists",
    meta: "45 sec",
    button: "Open",
    icon: "droplet",
    tone: "tone-eucalyptus",
    guideDesc: "Cool water quickly slows a racing heart.",
    durationSeconds: 45,
    guideSteps: [
      {
        title: "Turn on cool water",
        detail: "Cool tap water is enough — no need for painful ice.",
        icon: "droplet",
      },
      {
        title: "Hold inner wrists",
        detail: "Let the stream run across both inner wrists for 45 seconds.",
        icon: "clock",
      },
      {
        title: "Press to cheeks",
        detail: "Optionally press cool wet palms gently to your face.",
        icon: "snowflake",
      },
    ],
  },
];

export const BREATH_PHASES: BreathPhase[] = [
  { label: "Inhale", cue: "Softly through the nose", expand: true },
  { label: "Hold", cue: "Let the air settle", expand: true },
  { label: "Exhale", cue: "Unclench jaw & shoulders", expand: false },
  { label: "Rest", cue: "Quiet pause at the bottom", expand: false },
];
