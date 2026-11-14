import type { IconName } from "../components/icons";
import type { BackendAnomaly, BackendSuggestion } from "./behavioralNudges";

export type Tab = "Today" | "Ground" | "Wins" | "Anchor";

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

export type PracticeModalState = {
  mode: "breath" | "sensory";
  category: string;
  title: string;
  description: string;
  icon: IconName;
  tips?: string[];
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
};

export const TABS: { name: Tab; icon: IconName }[] = [
  { name: "Today", icon: "sun" },
  { name: "Ground", icon: "spa" },
  { name: "Wins", icon: "heart" },
  { name: "Anchor", icon: "anchor" },
];

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

export const WIN_SUGGESTIONS: { label: string; icon: IconName }[] = [
  { label: "Drank water", icon: "tree" },
  { label: "Took 3 slow breaths", icon: "meditate" },
  { label: "Stretched my neck", icon: "spa" },
  { label: "Ate something nourishing", icon: "sun" },
  { label: "Said no to pressure", icon: "heart" },
  { label: "Rested without guilt", icon: "spa" },
];

export const SENSORY_STEPS = [
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

export const INITIAL_ANCHORS: AnchorItem[] = [
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

export const BREATH_PHASES: BreathPhase[] = [
  { label: "Inhale", cue: "Softly through the nose", expand: true },
  { label: "Hold", cue: "Let the air settle", expand: true },
  { label: "Exhale", cue: "Unclench jaw & shoulders", expand: false },
  { label: "Rest", cue: "Quiet pause at the bottom", expand: false },
];
