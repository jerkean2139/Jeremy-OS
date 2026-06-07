"use client";

import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, ShieldCheck, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import { type JeremyState } from "@/lib/types";
import { buildSeries, startOfDayKey } from "@/lib/analytics";
import { todayKey } from "@/lib/utils";

export default function BackupPage() {
  return (
    <HydrationGate>
      <Backup />
    </HydrationGate>
  );
}

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
] as const;

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Backup() {
  const store = useStore();
  const importState = useStore((s) => s.importState);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const snapshot = (): JeremyState => ({
    identity: store.identity,
    days: store.days,
    elevatorLogs: store.elevatorLogs,
    theaterLogs: store.theaterLogs,
    pulseLogs: store.pulseLogs,
    manumation: store.manumation,
    coachHistory: store.coachHistory,
    coachMemory: store.coachMemory,
    reminders: store.reminders,
  });

  const exportJson = () => {
    const payload = {
      app: "jeremy-os",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: snapshot(),
    };
    download(`jeremy-os-backup-${todayKey()}.json`, JSON.stringify(payload, null, 2), "application/json");
    setStatus({ kind: "ok", msg: "Backup downloaded. Keep it somewhere safe." });
  };

  const exportCsv = () => {
    // Span from the earliest piece of data through today.
    const keys = new Set<string>(Object.keys(store.days));
    for (const l of store.elevatorLogs) keys.add(startOfDayKey(l.timestamp));
    for (const l of store.theaterLogs) keys.add(startOfDayKey(l.timestamp));
    for (const l of store.pulseLogs) keys.add(startOfDayKey(l.timestamp));
    const earliest = Array.from(keys).sort()[0] ?? todayKey();
    const span =
      Math.round((Date.now() - new Date(`${earliest}T00:00:00`).getTime()) / 86400000) + 1;
    const series = buildSeries(
      store.days,
      store.elevatorLogs,
      store.theaterLogs,
      store.pulseLogs,
      Math.min(Math.max(span, 1), 1000)
    );
    const header = [
      "date",
      "pressure",
      "floors",
      "acts",
      "sleep",
      "weight",
      "readiness",
      "sleepScore",
      "hrv",
      "restingHr",
      "steps",
      "movedMountain",
      "pulseMountain",
      "pulseNoise",
      "focusPct",
    ];
    const rows = series.map((p) =>
      [
        p.date,
        p.pressure ?? "",
        p.floors,
        p.acts,
        p.sleep ?? "",
        p.weight ?? "",
        p.readiness ?? "",
        p.sleepScore ?? "",
        p.hrv ?? "",
        p.restingHr ?? "",
        p.steps ?? "",
        p.movedMountain ?? "",
        p.pulseMountain,
        p.pulseNoise,
        p.focusPct ?? "",
      ].join(",")
    );
    download(`jeremy-os-daily-${todayKey()}.csv`, [header.join(","), ...rows].join("\n"), "text/csv");
    setStatus({ kind: "ok", msg: "Daily CSV downloaded." });
  };

  const onPickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = (parsed?.data ?? parsed) as Partial<JeremyState>;
      const hasKnownKey = DATA_KEYS.some((k) => k in (data ?? {}));
      if (!data || typeof data !== "object" || !hasKnownKey) {
        setStatus({ kind: "err", msg: "That doesn't look like a Jeremy OS backup." });
        return;
      }
      if (
        !window.confirm(
          "Restore this backup? It replaces your current data on this device (and syncs up if cloud sync is on)."
        )
      ) {
        return;
      }
      importState(data);
      setStatus({ kind: "ok", msg: "Backup restored." });
    } catch {
      setStatus({ kind: "err", msg: "Couldn't read that file. Is it valid JSON?" });
    }
  };

  return (
    <div>
      <PageHeader title="Backup & Export" subtitle="Your data is yours. Take it anywhere." back="/" />

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Back up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-mist-400">
              A full snapshot — every day, log, and setting — as a single file you can re-import
              later or move to another device.
            </p>
            <Button variant="soft" className="w-full" onClick={exportJson}>
              <Download className="h-4 w-4" /> Download full backup (JSON)
            </Button>
            <Button variant="soft" className="w-full" onClick={exportCsv}>
              <FileSpreadsheet className="h-4 w-4" /> Export daily data (CSV)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restore</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-mist-400">
              Import a backup file to restore your data. This replaces what&apos;s currently on this
              device.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              className="hidden"
            />
            <Button variant="outline" className="w-full" onClick={onPickFile}>
              <Upload className="h-4 w-4" /> Restore from backup
            </Button>
          </CardContent>
        </Card>

        {status && (
          <div
            className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
              status.kind === "ok"
                ? "border-sage-500/30 bg-sage-500/10 text-sage-300"
                : "border-ember-500/30 bg-ember-500/10 text-ember-300"
            }`}
          >
            {status.kind === "ok" ? (
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {status.msg}
          </div>
        )}

        <p className="px-1 text-xs text-mist-600">
          Everything stays on your device unless cloud sync is configured. Backups are plain files —
          store them somewhere private.
        </p>
      </div>
    </div>
  );
}
