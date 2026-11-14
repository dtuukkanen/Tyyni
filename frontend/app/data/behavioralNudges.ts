import type { IconName } from "../components/icons";
import type { SoundPreset } from "../components/soundEngine";
import type { PracticeModalState, Tab } from "./sanctuaryData";

export type BackendSeverity = "normal" | "attention" | "critical";

export type BackendAnomaly = {
  id: number;
  day: string;
  kind: string;
  severity: BackendSeverity;
  metric?: string | null;
  value?: number | null;
  baseline?: number | null;
  explanation?: {
    summary?: string;
    signals?: Record<string, unknown>;
    escalation?: string[];
  } | null;
};

export type BackendSuggestion = {
  id: number;
  day?: string;
  kind: string;
  title: string;
  text: string;
  minutes: number;
  category: string;
  anomaly_id?: number | null;
  anomaly_kind?: string | null;
  severity?: BackendSeverity | null;
  reason?: string | null;
  done?: boolean | null;
  helped?: boolean | null;
};

export type BehavioralAction =
  | { type: "open_practice"; modal: PracticeModalState }
  | { type: "open_sensory" }
  | { type: "play_sound"; preset: SoundPreset; label: string }
  | { type: "message_friend" }
  | { type: "navigate_tab"; tab: Tab; toast: string }
  | { type: "add_step"; stepLabel: string };

export type ResolvedBehavioralNudge = {
  id: number;
  kind: string;
  badgeLabel: string;
  tone: "moss" | "eucalyptus" | "blush";
  headline: string;
  subtitle: string;
  reason: string | null;
  ctaLabel: string;
  ctaIcon: IconName;
  action: BehavioralAction;
  done: boolean;
  helped: boolean | null;
};

type NudgeTemplate = {
  headline: (guestName: string) => string;
  badgePrefix: string;
  tone: "moss" | "eucalyptus" | "blush";
  ctaLabel: string;
  ctaIcon: IconName;
  action: BehavioralAction;
};

const PRACTICE_TEMPLATES: Record<string, NudgeTemplate> = {
  slow_walk: {
    headline: (name) => `Fancy a slow walk, ${name}?`,
    badgePrefix: "Gentle movement",
    tone: "moss",
    ctaLabel: "Start Mindful Walk",
    ctaIcon: "walk",
    action: {
      type: "open_practice",
      modal: {
        mode: "breath",
        category: "Movement · 10 Min",
        title: "Mindful Slow Walk",
        description:
          "Walk slowly outside without a destination, noticing each step and three quiet sounds around you.",
        icon: "walk",
      },
    },
  },
  nature_walk: {
    headline: (name) => `Some green space might feel good, ${name}.`,
    badgePrefix: "Outdoor reset",
    tone: "moss",
    ctaLabel: "Explore Nearby Nature",
    ctaIcon: "forest",
    action: {
      type: "navigate_tab",
      tab: "Ground",
      toast: "Opened Ground — explore nearby nature at your own pace.",
    },
  },
  mat_stretch: {
    headline: (name) => `Unwind your shoulders gently, ${name}.`,
    badgePrefix: "Soft movement",
    tone: "moss",
    ctaLabel: "Open Gentle Stretch",
    ctaIcon: "bed",
    action: {
      type: "open_practice",
      modal: {
        mode: "breath",
        category: "Movement · 8 Min",
        title: "Gentle Mat Stretch",
        description:
          "Move slowly through neck, shoulder, and hip releases — zero strain, pausing on every exhale.",
        icon: "bed",
      },
    },
  },
  body_scan: {
    headline: (name) => `Pause for a quiet meditation, ${name}?`,
    badgePrefix: "Guided rest",
    tone: "eucalyptus",
    ctaLabel: "Start Body Scan",
    ctaIcon: "meditate",
    action: {
      type: "open_practice",
      modal: {
        mode: "breath",
        category: "Meditation · 10 Min",
        title: "Gentle Body Scan",
        description:
          "Rest comfortably and move your attention slowly from your toes to your jaw, letting each part soften.",
        icon: "meditate",
      },
    },
  },
  box_breathing: {
    headline: (name) => `Let’s slow the pace together, ${name}.`,
    badgePrefix: "Calm rhythm",
    tone: "eucalyptus",
    ctaLabel: "Begin Box Breathing",
    ctaIcon: "air",
    action: {
      type: "open_practice",
      modal: {
        mode: "breath",
        category: "4-4-4-4 Rhythm · 4 Min",
        title: "Box Breathing",
        description:
          "Breathe in for 4, hold softly for 4, out for 4, rest for 4. Four quiet rounds settle a busy heart.",
        icon: "air",
      },
    },
  },
  physiological_sigh: {
    headline: (name) => `Take one deep release sigh, ${name}.`,
    badgePrefix: "Quick calm",
    tone: "eucalyptus",
    ctaLabel: "1-Tap Sigh Pacer",
    ctaIcon: "air",
    action: {
      type: "open_practice",
      modal: {
        mode: "breath",
        category: "Immediate Calm · 1 Min",
        title: "Double Inhale Sigh",
        description:
          "Two short breaths in through the nose, then one long slow exhale through the mouth.",
        icon: "air",
      },
    },
  },
  sound_sanctuary: {
    headline: (name) => `Let calm sounds hold the room, ${name}.`,
    badgePrefix: "Sound sanctuary",
    tone: "eucalyptus",
    ctaLabel: "Listen to Sanctuary",
    ctaIcon: "waves",
    action: {
      type: "play_sound",
      preset: "sanctuary",
      label: "Sound Sanctuary",
    },
  },
  sensory_grounding: {
    headline: (name) => `Come gently back to your senses, ${name}.`,
    badgePrefix: "Sensory reset",
    tone: "eucalyptus",
    ctaLabel: "Start 5–4–3–2–1 Reset",
    ctaIcon: "flower",
    action: {
      type: "open_sensory",
    },
  },
  message_friend: {
    headline: (name) => `Send a note to a friend today, ${name}?`,
    badgePrefix: "Warm connection",
    tone: "blush",
    ctaLabel: "Send a Gentle Wave",
    ctaIcon: "wave",
    action: {
      type: "message_friend",
    },
  },
  crisis_support: {
    headline: (name) => `You don’t have to carry this alone, ${name}.`,
    badgePrefix: "Care & support",
    tone: "blush",
    ctaLabel: "Open Support & Helpline",
    ctaIcon: "heart",
    action: {
      type: "navigate_tab",
      tab: "Anchor",
      toast: "Emergency Tether and MIELI Crisis Helpline are ready below.",
    },
  },
  journal: {
    headline: (name) => `Put today into a few quiet words, ${name}.`,
    badgePrefix: "Quiet reflection",
    tone: "moss",
    ctaLabel: "Log a Quiet Moment",
    ctaIcon: "sprout",
    action: {
      type: "navigate_tab",
      tab: "Wins",
      toast: "Capture any small honest moment — no filter needed.",
    },
  },
  wind_down: {
    headline: (name) => `Give yourself a softer evening, ${name}.`,
    badgePrefix: "Restful rhythm",
    tone: "eucalyptus",
    ctaLabel: "Add Wind-Down Step",
    ctaIcon: "moon",
    action: {
      type: "add_step",
      stepLabel: "Set phone aside 30 min early for a dim, quiet wind-down",
    },
  },
  earlier_bedtime: {
    headline: (name) => `An earlier rest tonight might help, ${name}.`,
    badgePrefix: "Sleep care",
    tone: "eucalyptus",
    ctaLabel: "Add Early Rest Step",
    ctaIcon: "moon",
    action: {
      type: "add_step",
      stepLabel: "Tuck in 30 minutes earlier tonight without alarms or rush",
    },
  },
  power_nap: {
    headline: (name) => `A short afternoon rest is welcome, ${name}.`,
    badgePrefix: "Restful pause",
    tone: "eucalyptus",
    ctaLabel: "Play Soft Rest Audio",
    ctaIcon: "moon",
    action: {
      type: "play_sound",
      preset: "sanctuary",
      label: "20-Minute Rest Soundscape",
    },
  },
  morning_light: {
    headline: (name) => `Step into morning daylight, ${name}.`,
    badgePrefix: "Body clock cue",
    tone: "moss",
    ctaLabel: "Add Daylight Step",
    ctaIcon: "sun",
    action: {
      type: "add_step",
      stepLabel: "Step outside into natural morning light for 10 minutes",
    },
  },
  regular_wake: {
    headline: (name) => `Anchor your morning gently, ${name}.`,
    badgePrefix: "Steady rhythm",
    tone: "moss",
    ctaLabel: "Add Morning Cue",
    ctaIcon: "sun",
    action: {
      type: "add_step",
      stepLabel: "Keep a gentle, steady wake-up window tomorrow morning",
    },
  },
  phone_free_hour: {
    headline: (name) => `Rest your eyes from the screen, ${name}.`,
    badgePrefix: "Screen pause",
    tone: "eucalyptus",
    ctaLabel: "Start 5–4–3–2–1 Reset",
    ctaIcon: "spa",
    action: {
      type: "open_sensory",
    },
  },
};

const ANOMALY_FALLBACK_PRACTICE: Record<string, BackendSuggestion> = {
  low_activity: {
    id: -101,
    kind: "slow_walk",
    title: "Mindful slow walk",
    text: "Walk slowly outside for ten minutes, noticing each step and what you hear.",
    minutes: 10,
    category: "movement",
  },
  stress: {
    id: -102,
    kind: "body_scan",
    title: "Gentle body scan",
    text: "Move your attention slowly from your toes to your head, letting each part soften.",
    minutes: 10,
    category: "rest",
  },
  low_mood: {
    id: -103,
    kind: "message_friend",
    title: "Reach out to a friend",
    text: "Send a message to someone you trust. You don’t have to explain everything.",
    minutes: 5,
    category: "social",
  },
  short_sleep: {
    id: -104,
    kind: "wind_down",
    title: "Screen-free wind-down",
    text: "Put the phone away 30 minutes before bed, dim the lights, and do something calm.",
    minutes: 30,
    category: "sleep",
  },
  long_sleep: {
    id: -105,
    kind: "morning_light",
    title: "Morning daylight",
    text: "Get outside within an hour of waking. Daylight gently anchors your rhythm.",
    minutes: 10,
    category: "sleep",
  },
  sleep_shift: {
    id: -106,
    kind: "morning_light",
    title: "Morning daylight",
    text: "Natural morning light helps reset a shifted sleep window without pressure.",
    minutes: 10,
    category: "sleep",
  },
  screen_time: {
    id: -107,
    kind: "sensory_grounding",
    title: "5-4-3-2-1 grounding",
    text: "Give your eyes a rest by noticing five quiet things in the room around you.",
    minutes: 3,
    category: "grounding",
  },
};

export function resolveBehavioralNudges(
  guestName: string,
  suggestions: BackendSuggestion[] = [],
  anomalies: BackendAnomaly[] = [],
): ResolvedBehavioralNudge[] {
  const sourceRows: BackendSuggestion[] =
    suggestions.length > 0
      ? suggestions
      : anomalies.flatMap((anomaly) => {
          const fallback = ANOMALY_FALLBACK_PRACTICE[anomaly.kind];
          if (!fallback) return [];
          return [
            {
              ...fallback,
              severity: anomaly.severity,
              anomaly_kind: anomaly.kind,
              reason: anomaly.explanation?.summary ?? null,
            },
          ];
        });

  return sourceRows.map((row) => {
    const template =
      PRACTICE_TEMPLATES[row.kind] ?? PRACTICE_TEMPLATES.box_breathing;
    const tone =
      row.severity === "critical" && row.kind === "crisis_support"
        ? "blush"
        : template.tone;
    const badgeLabel =
      row.minutes > 0
        ? `${template.badgePrefix} · ${row.minutes} min`
        : template.badgePrefix;

    return {
      id: row.id,
      kind: row.kind,
      badgeLabel,
      tone,
      headline: template.headline(guestName),
      subtitle: row.text,
      reason: row.reason ?? null,
      ctaLabel: template.ctaLabel,
      ctaIcon: template.ctaIcon,
      action: template.action,
      done: Boolean(row.done),
      helped: row.helped ?? null,
    };
  });
}

export type DemoNudgeKey = "none" | "walk" | "meditate" | "friend" | "sleep";

export const DEMO_NUDGE_OPTIONS: {
  key: DemoNudgeKey;
  label: string;
  suggestions: BackendSuggestion[];
}[] = [
  {
    key: "none",
    label: "Default",
    suggestions: [],
  },
  {
    key: "walk",
    label: "Walk",
    suggestions: [
      {
        id: -1,
        kind: "slow_walk",
        title: "Mindful slow walk",
        text: "Walk slowly outside for ten minutes, noticing each step and what you hear.",
        minutes: 10,
        category: "movement",
        anomaly_kind: "low_activity",
        severity: "attention",
        reason: "Movement was quieter than usual yesterday",
      },
    ],
  },
  {
    key: "meditate",
    label: "Meditate",
    suggestions: [
      {
        id: -2,
        kind: "body_scan",
        title: "Gentle body scan",
        text: "Move your attention slowly from your toes to your jaw, letting each part soften.",
        minutes: 10,
        category: "rest",
        anomaly_kind: "stress",
        severity: "attention",
        reason: "Resting heart rhythm looked a little tense",
      },
      {
        id: -3,
        kind: "box_breathing",
        title: "Box breathing",
        text: "Breathe in for 4, hold for 4, out for 4, hold for 4. Four rounds slow a racing heart.",
        minutes: 4,
        category: "breathing",
        anomaly_kind: "stress",
        severity: "attention",
        reason: "Resting heart rhythm looked a little tense",
      },
    ],
  },
  {
    key: "friend",
    label: "Message Friend",
    suggestions: [
      {
        id: -4,
        kind: "message_friend",
        title: "Reach out to a friend",
        text: "Send a warm check-in to someone you trust — you don’t have to explain everything.",
        minutes: 5,
        category: "social",
        anomaly_kind: "low_mood",
        severity: "attention",
        reason: "Recent check-ins felt heavier than your usual baseline",
      },
    ],
  },
  {
    key: "sleep",
    label: "Sleep Rhythm",
    suggestions: [
      {
        id: -5,
        kind: "morning_light",
        title: "Morning daylight",
        text: "Step outside within an hour of waking so natural light gently steadies your body clock.",
        minutes: 10,
        category: "sleep",
        anomaly_kind: "sleep_shift",
        severity: "attention",
        reason: "Sleep timing shifted later over the last couple of nights",
      },
    ],
  },
];
