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
  response: string;
};

export type PracticeModalState = {
  mode: "breath" | "sensory";
  category: string;
  title: string;
  description: string;
  icon: IconName;
  tips?: string[];
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
    response:
      "Tired is noted. Wrap yourself in quiet — today asks only for soft rest.",
  },
  {
    id: "Tender",
    label: "Tender",
    icon: "sprout",
    response:
      "A bit tender is felt. Move with gentle kindness around yourself right now.",
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
    response:
      "Clear and light is embraced. Enjoy the quiet ease of this moment.",
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

export const CIRCLE_MEMBERS = [
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

export const BREATH_PHASES = [
  { label: "Inhale", cue: "Softly through the nose", expand: true },
  { label: "Hold", cue: "Let the air settle", expand: true },
  { label: "Exhale", cue: "Unclench jaw & shoulders", expand: false },
  { label: "Rest", cue: "Quiet pause at the bottom", expand: false },
];
