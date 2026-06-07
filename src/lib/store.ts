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
  DEFAULT_REMINDERS,
} from "./types";
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

  addCoachMessage: (msg: Omit<CoachMessage, "id" | "timestamp">) => void;
  clearCoach: () => void;

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
      reminders: DEFAULT_REMINDERS,

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

      addCoachMessage: (msg) =>
        set((s) => ({
          coachHistory: [
            ...s.coachHistory,
            { ...msg, id: uid(), timestamp: new Date().toISOString() },
          ],
        })),

      clearCoach: () => set({ coachHistory: [] }),

      importState: (data) =>
        set((s) => ({
          identity: data.identity ?? s.identity,
          days: data.days ?? s.days,
          elevatorLogs: data.elevatorLogs ?? s.elevatorLogs,
          theaterLogs: data.theaterLogs ?? s.theaterLogs,
          pulseLogs: data.pulseLogs ?? s.pulseLogs,
          manumation: data.manumation ?? s.manumation,
          coachHistory: data.coachHistory ?? s.coachHistory,
          reminders: data.reminders ?? s.reminders,
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
        reminders: s.reminders,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
