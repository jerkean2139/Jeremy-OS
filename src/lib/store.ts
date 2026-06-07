"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  type JeremyState,
  type DayEntry,
  type ElevatorLog,
  type TheaterLog,
  type MorningCheckIn,
  type DailyReflection,
  type ManumationState,
  type CoachMessage,
  type PulseEntry,
  type ReminderPrefs,
  type ScriptureProgress,
  type Habit,
  type HabitLaws,
  type HabitKind,
  type KeyHabit,
  type KeyHabitLaws,
  type ScorecardItem,
  type ScorecardMark,
  DEFAULT_REMINDERS,
  DEFAULT_SCRIPTURE,
  DEFAULT_KEY_HABIT_LAWS,
} from "./types";
import { clampDay } from "./bible";
import { DEFAULT_IDENTITY } from "./codewords";
import { todayKey, uid } from "./utils";

export type SyncStatus =
  | "idle"
  | "local" // no database configured; localStorage only
  | "saving"
  | "synced"
  | "offline"
  | "error";

interface StoreActions {
  // hydration flag so we can avoid SSR/client mismatch flashes
  _hydrated: boolean;
  setHydrated: () => void;

  // cloud-sync status (Postgres backend); not persisted
  _syncStatus: SyncStatus;
  _lastSyncedAt: string | null;

  getDay: (date?: string) => DayEntry;
  updateDay: (patch: Partial<DayEntry>, date?: string) => void;

  setIdentity: (lines: string[]) => void;

  saveMorning: (m: MorningCheckIn, date?: string) => void;
  saveReflection: (r: DailyReflection, date?: string) => void;

  addElevatorLog: (log: Omit<ElevatorLog, "id" | "timestamp"> & { timestamp?: string }) => void;
  addTheaterLog: (log: Omit<TheaterLog, "id" | "timestamp"> & { timestamp?: string }) => void;
  addPulseLog: (log: Omit<PulseEntry, "id" | "timestamp"> & { timestamp?: string }) => void;

  deleteElevatorLog: (id: string) => void;
  deleteTheaterLog: (id: string) => void;
  deletePulseLog: (id: string) => void;

  setManumation: (patch: Partial<ManumationState>) => void;

  setReminders: (patch: Partial<ReminderPrefs>) => void;

  // Bible reading plan: advance after a reading, or jump to a specific day.
  markScriptureRead: () => void;
  setScriptureDay: (day: number) => void;

  // Atomic Habits.
  addHabit: (input: {
    name: string;
    kind: HabitKind;
    identity?: string;
    twoMinute?: string;
    stackAfter?: string;
    cueTime?: string;
    cuePlace?: string;
    stakes?: string;
    accountablePartner?: string;
    laws?: HabitLaws;
  }) => void;
  updateHabit: (id: string, patch: Partial<Omit<Habit, "id" | "createdAt">>) => void;
  archiveHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  toggleHabitDay: (id: string, date?: string) => void;

  // Inverted Four Laws strategy for a key habit (Elevator / Theater).
  setKeyHabitLaws: (key: KeyHabit, laws: HabitLaws) => void;

  // Habit Scorecard.
  addScorecardItem: (text: string, mark: ScorecardMark) => void;
  updateScorecardItem: (id: string, patch: Partial<Omit<ScorecardItem, "id" | "createdAt">>) => void;
  removeScorecardItem: (id: string) => void;

  completeOnboarding: () => void;

  addCoachMessage: (msg: Omit<CoachMessage, "id" | "timestamp">) => void;
  clearCoach: () => void;

  setCoachMemory: (notes: string[]) => void;
  addCoachMemory: (note: string) => void;
  removeCoachMemory: (index: number) => void;

  // Replace the whole document from a backup file (data export/restore).
  importState: (data: Partial<JeremyState>) => void;
}

export type Store = JeremyState & StoreActions;

function emptyDay(date: string): DayEntry {
  return {
    date,
    mountain: "",
    pressureLevel: 5,
    pressureSources: [],
    movedMountain: null,
  };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // --- initial state ---
      identity: { lines: DEFAULT_IDENTITY },
      days: {},
      elevatorLogs: [],
      theaterLogs: [],
      pulseLogs: [],
      manumation: {
        funnelCompletion: 0,
        contentLoaded: 0,
        outboundStatus: 0,
        summitPlanning: 0,
        teamReadiness: 0,
      },
      coachHistory: [],
      coachMemory: [],
      reminders: DEFAULT_REMINDERS,
      scripture: DEFAULT_SCRIPTURE,
      habits: [],
      keyHabitLaws: DEFAULT_KEY_HABIT_LAWS,
      scorecard: [],
      onboardedAt: null,

      _hydrated: false,
      setHydrated: () => set({ _hydrated: true }),

      _syncStatus: "idle",
      _lastSyncedAt: null,

      // --- day ---
      getDay: (date) => {
        const key = date ?? todayKey();
        return get().days[key] ?? emptyDay(key);
      },
      updateDay: (patch, date) => {
        const key = date ?? todayKey();
        set((s) => {
          const current = s.days[key] ?? emptyDay(key);
          return { days: { ...s.days, [key]: { ...current, ...patch } } };
        });
      },

      setIdentity: (lines) => set({ identity: { lines } }),

      saveMorning: (m, date) => {
        const key = date ?? todayKey();
        set((s) => {
          const current = s.days[key] ?? emptyDay(key);
          return {
            days: {
              ...s.days,
              [key]: {
                ...current,
                morning: m,
                // The morning check-in seeds the day's mountain + pressure.
                mountain: m.mountain || current.mountain,
              },
            },
          };
        });
      },

      saveReflection: (r, date) => {
        const key = date ?? todayKey();
        set((s) => {
          const current = s.days[key] ?? emptyDay(key);
          return {
            days: {
              ...s.days,
              [key]: { ...current, reflection: r, movedMountain: r.movedMountain },
            },
          };
        });
      },

      addElevatorLog: (log) =>
        set((s) => ({
          elevatorLogs: [
            { ...log, id: uid(), timestamp: log.timestamp ?? new Date().toISOString() },
            ...s.elevatorLogs,
          ],
        })),

      addTheaterLog: (log) =>
        set((s) => ({
          theaterLogs: [
            { ...log, id: uid(), timestamp: log.timestamp ?? new Date().toISOString() },
            ...s.theaterLogs,
          ],
        })),

      addPulseLog: (log) =>
        set((s) => ({
          pulseLogs: [
            { ...log, id: uid(), timestamp: log.timestamp ?? new Date().toISOString() },
            ...s.pulseLogs,
          ],
        })),

      deleteElevatorLog: (id) =>
        set((s) => ({ elevatorLogs: s.elevatorLogs.filter((l) => l.id !== id) })),
      deleteTheaterLog: (id) =>
        set((s) => ({ theaterLogs: s.theaterLogs.filter((l) => l.id !== id) })),
      deletePulseLog: (id) =>
        set((s) => ({ pulseLogs: s.pulseLogs.filter((l) => l.id !== id) })),

      setManumation: (patch) =>
        set((s) => ({ manumation: { ...s.manumation, ...patch } })),

      setReminders: (patch) =>
        set((s) => ({ reminders: { ...s.reminders, ...patch } })),

      markScriptureRead: () =>
        set((s) => {
          const sc = s.scripture ?? DEFAULT_SCRIPTURE;
          const date = todayKey();
          const day = clampDay(sc.currentDay);
          // Don't double-log the same day's reading.
          const already = sc.readLog.some((r) => r.day === day);
          return {
            scripture: {
              currentDay: clampDay(day + 1),
              lastReadDate: date,
              readLog: already ? sc.readLog : [...sc.readLog, { date, day }],
            },
          };
        }),

      setScriptureDay: (day) =>
        set((s) => ({
          scripture: { ...(s.scripture ?? DEFAULT_SCRIPTURE), currentDay: clampDay(day) },
        })),

      addHabit: (input) =>
        set((s) => ({
          habits: [
            ...(s.habits ?? []),
            {
              id: uid(),
              name: input.name.trim(),
              kind: input.kind,
              identity: input.identity?.trim() || undefined,
              twoMinute: input.twoMinute?.trim() || undefined,
              stackAfter: input.stackAfter?.trim() || undefined,
              cueTime: input.cueTime?.trim() || undefined,
              cuePlace: input.cuePlace?.trim() || undefined,
              stakes: input.stakes?.trim() || undefined,
              accountablePartner: input.accountablePartner?.trim() || undefined,
              laws: input.laws ?? {},
              createdAt: new Date().toISOString(),
              archivedAt: null,
              log: [],
            },
          ],
        })),

      updateHabit: (id, patch) =>
        set((s) => ({
          habits: (s.habits ?? []).map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),

      archiveHabit: (id) =>
        set((s) => ({
          habits: (s.habits ?? []).map((h) =>
            h.id === id ? { ...h, archivedAt: new Date().toISOString() } : h
          ),
        })),

      deleteHabit: (id) =>
        set((s) => ({ habits: (s.habits ?? []).filter((h) => h.id !== id) })),

      toggleHabitDay: (id, date) => {
        const key = date ?? todayKey();
        set((s) => ({
          habits: (s.habits ?? []).map((h) => {
            if (h.id !== id) return h;
            const has = h.log.includes(key);
            return { ...h, log: has ? h.log.filter((d) => d !== key) : [...h.log, key] };
          }),
        }));
      },

      setKeyHabitLaws: (key, laws) =>
        set((s) => ({
          keyHabitLaws: { ...(s.keyHabitLaws ?? DEFAULT_KEY_HABIT_LAWS), [key]: laws },
        })),

      addScorecardItem: (text, mark) =>
        set((s) => {
          const t = text.trim();
          if (!t) return {};
          return {
            scorecard: [
              ...(s.scorecard ?? []),
              { id: uid(), text: t, mark, createdAt: new Date().toISOString() },
            ],
          };
        }),

      updateScorecardItem: (id, patch) =>
        set((s) => ({
          scorecard: (s.scorecard ?? []).map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),

      removeScorecardItem: (id) =>
        set((s) => ({ scorecard: (s.scorecard ?? []).filter((i) => i.id !== id) })),

      completeOnboarding: () => set({ onboardedAt: new Date().toISOString() }),

      addCoachMessage: (msg) =>
        set((s) => ({
          coachHistory: [
            ...s.coachHistory,
            { ...msg, id: uid(), timestamp: new Date().toISOString() },
          ],
        })),

      clearCoach: () => set({ coachHistory: [] }),

      setCoachMemory: (notes) => set({ coachMemory: notes }),
      addCoachMemory: (note) =>
        set((s) => {
          const n = note.trim();
          if (!n || s.coachMemory.includes(n)) return {};
          return { coachMemory: [...s.coachMemory, n] };
        }),
      removeCoachMemory: (index) =>
        set((s) => ({ coachMemory: s.coachMemory.filter((_, i) => i !== index) })),

      importState: (data) =>
        set((s) => ({
          identity: data.identity ?? s.identity,
          days: data.days ?? s.days,
          elevatorLogs: data.elevatorLogs ?? s.elevatorLogs,
          theaterLogs: data.theaterLogs ?? s.theaterLogs,
          pulseLogs: data.pulseLogs ?? s.pulseLogs,
          manumation: data.manumation ?? s.manumation,
          coachHistory: data.coachHistory ?? s.coachHistory,
          coachMemory: data.coachMemory ?? s.coachMemory,
          reminders: data.reminders ?? s.reminders,
          scripture: data.scripture ?? s.scripture,
          habits: data.habits ?? s.habits,
          keyHabitLaws: data.keyHabitLaws ?? s.keyHabitLaws,
          scorecard: data.scorecard ?? s.scorecard,
          onboardedAt: data.onboardedAt ?? s.onboardedAt,
        })),
    }),
    {
      name: "jeremy-os-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        identity: s.identity,
        days: s.days,
        elevatorLogs: s.elevatorLogs,
        theaterLogs: s.theaterLogs,
        pulseLogs: s.pulseLogs,
        manumation: s.manumation,
        coachHistory: s.coachHistory,
        coachMemory: s.coachMemory,
        reminders: s.reminders,
        scripture: s.scripture,
        habits: s.habits,
        keyHabitLaws: s.keyHabitLaws,
        scorecard: s.scorecard,
        onboardedAt: s.onboardedAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
