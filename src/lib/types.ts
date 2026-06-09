// Core domain model for Jeremy OS.
// Note: "code words" are used in the UI layer. The data model uses neutral,
// internal names so the meaning stays private and consistent.

export type PressureSource =
  | "Financial"
  | "Health"
  | "Client"
  | "Team"
  | "Marriage"
  | "Future"
  | "Unknown";

export const PRESSURE_SOURCES: PressureSource[] = [
  "Financial",
  "Health",
  "Client",
  "Team",
  "Marriage",
  "Future",
  "Unknown",
];

export type ElevatorTrigger =
  | "Overwhelm"
  | "Avoiding task"
  | "Financial fear"
  | "Client issue"
  | "Team issue"
  | "Boredom"
  | "Habit"
  | "Fatigue"
  | "Other";

export const ELEVATOR_TRIGGERS: ElevatorTrigger[] = [
  "Overwhelm",
  "Avoiding task",
  "Financial fear",
  "Client issue",
  "Team issue",
  "Boredom",
  "Habit",
  "Fatigue",
  "Other",
];

// A single day's snapshot. Keyed by ISO date (YYYY-MM-DD).
export interface DayEntry {
  date: string; // YYYY-MM-DD
  mountain: string; // Today's single primary goal
  pressureLevel: number; // 1-10
  pressureSources: PressureSource[];
  weight?: number; // lbs
  sleepHours?: number;
  // Recovery metrics entered by hand from Oura / Apple Health.
  readiness?: number; // Oura readiness score, 0-100
  sleepScore?: number; // Oura sleep score, 0-100
  hrv?: number; // overnight HRV, ms
  restingHr?: number; // resting heart rate, bpm
  steps?: number; // walking steps (morning walk + day)
  routine?: RoutineLog; // the morning ritual, when completed
  movedMountain?: boolean | null; // set during reflection
  morning?: MorningCheckIn;
  reflection?: DailyReflection;
}

// A movement part of the ritual that can be set aside in the morning and
// made up later in the day (e.g. a walk at lunch).
export type RoutinePart = "stretch" | "walk";

// The morning ritual: check-in → stretch → walk → complete. Durations in seconds.
export interface RoutineLog {
  completedAt: string; // ISO
  totalSec: number; // whole-ritual elapsed
  stretchSec: number;
  walkSec: number;
  // Parts skipped this morning — still open to make up later in the day.
  skipped?: RoutinePart[];
  // Make-up sessions logged later (e.g. a lunchtime walk).
  makeups?: { part: RoutinePart; at: string; sec: number; steps?: number }[];
}

export interface MorningCheckIn {
  whatIsTrue: string;
  mountain: string;
  pressure: string;
  win: string;
  voiceTranscript?: string;
  aiSummary?: string;
  completedAt: string; // ISO timestamp
}

export interface DailyReflection {
  win: string;
  mostPressure: string;
  movedMountain: boolean | null;
  learned: string;
  voiceTranscript?: string;
  completedAt: string; // ISO timestamp
}

// Elevator = THC usage. Floors = number of sessions.
export interface ElevatorLog {
  id: string;
  timestamp: string; // ISO
  floors: number;
  pressureLevel: number; // 1-10
  triggers: ElevatorTrigger[];
  note?: string;
}

// Theater = porn usage. Acts = number of sessions. Stored privately.
export interface TheaterLog {
  id: string;
  timestamp: string; // ISO
  acts: number;
  pressureLevel: number; // 1-10
  trigger: string;
}

export interface IdentityStatement {
  lines: string[];
}

// --- Atomic Habits layer ---
// A user-defined habit, designed with James Clear's Four Laws. For habits
// you're building the laws are read straight (obvious/attractive/easy/
// satisfying); for habits you're breaking they're the inversion
// (invisible/unattractive/difficult/unsatisfying).
export type HabitKind = "build" | "break";

export interface HabitLaws {
  obvious?: string; // 1st law: make it obvious / invisible (the cue)
  attractive?: string; // 2nd law: make it attractive / unattractive (the craving)
  easy?: string; // 3rd law: make it easy / difficult (the response)
  satisfying?: string; // 4th law: make it satisfying / unsatisfying (the reward)
}

export interface Habit {
  id: string;
  name: string;
  kind: HabitKind;
  identity?: string; // "the kind of person who…"
  twoMinute?: string; // the two-minute version
  // Implementation intention / habit stacking: "After [stackAfter], I will
  // [name] at [cueTime] in [cuePlace]." Any part is optional.
  stackAfter?: string; // an anchor habit you already do
  cueTime?: string; // "HH:MM"
  cuePlace?: string; // a location
  // Temptation bundling ("make it attractive"): a want you only allow
  // yourself while/right after doing this habit.
  temptation?: string;
  // Accountability ("make it unsatisfying to miss"): a contract + a witness.
  stakes?: string; // what it costs you to miss
  accountablePartner?: string; // who you've told / who's watching
  laws: HabitLaws;
  createdAt: string; // ISO
  archivedAt?: string | null;
  // For "build": dateKeys the habit was done. For "break": dateKeys it slipped.
  log: string[];
}

// Standing "inverted Four Laws" strategy for the two key habits (Elevator,
// Theater) — make it invisible / unattractive / difficult / unsatisfying.
export type KeyHabit = "elevator" | "theater";

export type KeyHabitLaws = Record<KeyHabit, HabitLaws>;

export const DEFAULT_KEY_HABIT_LAWS: KeyHabitLaws = {
  elevator: {},
  theater: {},
};

// Habit Scorecard — Clear's awareness exercise: list your current daily
// habits and mark each relative to who you want to become. No judgment.
export type ScorecardMark = "good" | "neutral" | "bad"; // + / = / −

export interface ScorecardItem {
  id: string;
  text: string;
  mark: ScorecardMark;
  createdAt: string; // ISO
}

// One-year Bible reading plan progress. Self-paced: `currentDay` is how far
// you've read (1..365), not the calendar — no guilt, only forward motion.
// A highlighted passage saved for study / conversation.
export interface ScriptureBookmark {
  id: string;
  day: number; // plan-day it came from
  ref: string; // e.g. "John 3"
  verses: number[]; // selected verse numbers
  text: string; // the selected verse text, joined
  createdAt: string; // ISO
}

export interface ScriptureProgress {
  currentDay: number; // the active reading day, 1-based
  lastReadDate?: string; // YYYY-MM-DD of the most recent completion
  readLog: { date: string; day: number }[]; // each completed reading
  bookmarks?: ScriptureBookmark[]; // highlighted passages
}

export const DEFAULT_SCRIPTURE: ScriptureProgress = {
  currentDay: 1,
  readLog: [],
  bookmarks: [],
};

// Pulse = a 15-minute awareness check. "Am I on the Mountain or in the Noise?"
export type PulseTag = "mountain" | "noise" | "admin";

export const PULSE_TAGS: { value: PulseTag; label: string }[] = [
  { value: "mountain", label: "Mountain" },
  { value: "admin", label: "Admin" },
  { value: "noise", label: "Noise" },
];

export interface PulseEntry {
  id: string;
  timestamp: string; // ISO
  activity: string; // what you were doing
  tag: PulseTag;
}

// Manumation launch command center.
export interface ManumationState {
  funnelCompletion: number; // 0-100
  contentLoaded: number; // 0-100
  outboundStatus: number; // 0-100
  summitPlanning: number; // 0-100
  teamReadiness: number; // 0-100
  launchDate?: string; // YYYY-MM-DD target
}

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Background push reminder preferences (delivered via Web Push + a cron sweep).
export interface ReminderPrefs {
  pushEnabled: boolean;
  morning: { enabled: boolean; time: string }; // "HH:MM" local-ish (see cron note)
  reflection: { enabled: boolean; time: string };
  pulse: { enabled: boolean; cadenceMin: number; startTime: string; endTime: string };
  // A gentle daily nudge to do the day's build habits — the two-minute version.
  habits: { enabled: boolean; time: string };
}

export const DEFAULT_REMINDERS: ReminderPrefs = {
  pushEnabled: false,
  morning: { enabled: true, time: "06:00" },
  reflection: { enabled: true, time: "21:00" },
  pulse: { enabled: false, cadenceMin: 60, startTime: "09:00", endTime: "17:00" },
  habits: { enabled: false, time: "12:00" },
};

// One metered AI call — estimated cost plus the raw usage it came from.
export interface AiUsageEntry {
  id: string;
  ts: string; // ISO timestamp
  feature: string; // coach | scripture | summary | insight | review | memory | tts | transcribe
  model: string;
  cost: number; // estimated USD
  inputTokens?: number;
  outputTokens?: number;
  units?: number; // chars (tts) or seconds (transcribe)
}

export interface JeremyState {
  identity: IdentityStatement;
  days: Record<string, DayEntry>;
  elevatorLogs: ElevatorLog[];
  theaterLogs: TheaterLog[];
  pulseLogs: PulseEntry[];
  manumation: ManumationState;
  coachHistory: CoachMessage[];
  // Durable facts the coach carries between sessions (editable; fed into every reply).
  coachMemory: string[];
  reminders: ReminderPrefs;
  // One-year Bible reading plan progress.
  scripture: ScriptureProgress;
  // Atomic Habits: user-defined habits to build or break.
  habits: Habit[];
  // Inverted Four Laws strategy for the two key habits.
  keyHabitLaws: KeyHabitLaws;
  // Habit Scorecard — awareness inventory of current habits.
  scorecard: ScorecardItem[];
  // Slack items you've swiped away as handled (keyed per message).
  slackDone?: string[];
  // Estimated AI spend, one entry per OpenAI-backed call.
  aiUsage?: AiUsageEntry[];
  // ISO timestamp of when first-run onboarding was completed; null until then.
  onboardedAt?: string | null;
}
