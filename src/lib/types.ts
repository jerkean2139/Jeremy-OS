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
  movedMountain?: boolean | null; // set during reflection
  morning?: MorningCheckIn;
  reflection?: DailyReflection;
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
}

export const DEFAULT_REMINDERS: ReminderPrefs = {
  pushEnabled: false,
  morning: { enabled: true, time: "07:30" },
  reflection: { enabled: true, time: "21:00" },
  pulse: { enabled: false, cadenceMin: 60, startTime: "09:00", endTime: "17:00" },
};

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
}
