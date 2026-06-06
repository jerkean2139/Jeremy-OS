// Code words keep the dashboard calm and private. Actual addiction terms
// are never shown in the UI. This file is the single source of truth for
// the language Jeremy OS speaks.

export const CODE_WORDS = {
  elevator: {
    label: "Elevator",
    countLabel: "Floors",
    action: "I Took The Elevator",
    // private meaning: THC usage / sessions
  },
  theater: {
    label: "Theater",
    countLabel: "Acts",
    action: "I Entered The Theater",
    // private meaning: porn usage / sessions
  },
  pressure: {
    label: "Pressure",
    // private meaning: anxiety level
  },
  mountain: {
    label: "Mountain",
    // private meaning: primary goal
  },
  noise: {
    label: "Noise",
    // private meaning: distractions
  },
} as const;

export const MISSION_STATEMENT = "Reduce noise. Increase clarity. Move the mountain.";

export const DEFAULT_IDENTITY = [
  "I help overwhelmed business owners escape chaos.",
  "I build systems that create freedom.",
  "I keep promises to myself.",
  "Today I move Manumation forward.",
];

export const MOUNTAIN_EXAMPLES = [
  "Launch funnel",
  "Record summit video",
  "Build dashboard",
  "Write chapter",
];
