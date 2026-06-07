"use client";

import { useStore, type Store } from "./store";
import { type JeremyState } from "./types";

// Client <-> server sync for the single-user Postgres backend.
//
// Strategy (single user, last-write-wins):
//  1. On load, pull the server document.
//     - If the server has meaningful data, it becomes the source of truth.
//     - If the server is empty but local has data, push local up (first run /
//       migrating an existing localStorage user into the database).
//  2. After the initial pull, every store change is debounced and pushed up.
//
// localStorage remains the instant-load cache and the full offline fallback.

let started = false;
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

const DATA_KEYS = [
  "identity",
  "days",
  "elevatorLogs",
  "theaterLogs",
  "pulseLogs",
  "manumation",
  "coachHistory",
  "coachMemory",
  "reminders",
  "scripture",
  "habits",
  "keyHabitLaws",
  "onboardedAt",
] as const;

function snapshot(state: Store): JeremyState {
  return {
    identity: state.identity,
    days: state.days,
    elevatorLogs: state.elevatorLogs,
    theaterLogs: state.theaterLogs,
    pulseLogs: state.pulseLogs,
    manumation: state.manumation,
    coachHistory: state.coachHistory,
    coachMemory: state.coachMemory,
    reminders: state.reminders,
    scripture: state.scripture,
    habits: state.habits,
    keyHabitLaws: state.keyHabitLaws,
    onboardedAt: state.onboardedAt,
  };
}

function isEmptyState(data: Partial<JeremyState> | null | undefined): boolean {
  if (!data) return true;
  const noDays = !data.days || Object.keys(data.days).length === 0;
  const noElevator = !data.elevatorLogs || data.elevatorLogs.length === 0;
  const noTheater = !data.theaterLogs || data.theaterLogs.length === 0;
  const noCoach = !data.coachHistory || data.coachHistory.length === 0;
  const m = data.manumation;
  const noManumation =
    !m ||
    (m.funnelCompletion === 0 &&
      m.contentLoaded === 0 &&
      m.outboundStatus === 0 &&
      m.summitPlanning === 0 &&
      m.teamReadiness === 0 &&
      !m.launchDate);
  return noDays && noElevator && noTheater && noCoach && noManumation;
}

async function pushNow(state: Store) {
  try {
    await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot(state)),
    });
    useStore.setState({ _syncStatus: "synced", _lastSyncedAt: new Date().toISOString() });
  } catch {
    useStore.setState({ _syncStatus: "error" });
  }
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  useStore.setState({ _syncStatus: "saving" });
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushNow(useStore.getState());
  }, 900);
}

async function pull() {
  let res: Response;
  try {
    res = await fetch("/api/state", { cache: "no-store" });
  } catch {
    useStore.setState({ _syncStatus: "offline" });
    return;
  }
  const json = await res.json().catch(() => null);

  // No database configured — stay in local-only mode silently.
  if (!json || json.configured === false) {
    useStore.setState({ _syncStatus: "local" });
    return;
  }

  if (json.data && !isEmptyState(json.data)) {
    // Server wins.
    applyingRemote = true;
    const incoming: Partial<JeremyState> = {};
    for (const k of DATA_KEYS) {
      if (json.data[k] !== undefined) (incoming as any)[k] = json.data[k];
    }
    useStore.setState(incoming);
    applyingRemote = false;
    useStore.setState({ _syncStatus: "synced", _lastSyncedAt: json.updatedAt ?? null });
  } else {
    // Server empty — seed it from whatever we have locally.
    await pushNow(useStore.getState());
  }
}

export async function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  await pull();

  // Push on every subsequent local change (debounced). Only react to real
  // data changes — ignoring internal meta churn (e.g. _syncStatus). Without
  // this guard, schedulePush's own setState({ _syncStatus }) would re-enter
  // this subscriber and recurse infinitely, throwing out of whatever store
  // write triggered it.
  useStore.subscribe((state, prev) => {
    if (applyingRemote) return;
    const dataChanged = DATA_KEYS.some((k) => state[k] !== prev[k]);
    if (!dataChanged) return;
    schedulePush();
  });

  // Best-effort flush when leaving the page.
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
      void pushNow(useStore.getState());
    }
  });
}
