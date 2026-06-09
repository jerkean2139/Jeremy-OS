// Pure helpers to summarize metered AI spend for the cost meter.

import { type AiUsageEntry } from "./types";
import { todayKey } from "./utils";

export interface UsageSummary {
  today: number;
  month: number;
  total: number;
  count: number;
  byFeature: { feature: string; cost: number }[];
}

export function usageSummary(entries: AiUsageEntry[] = []): UsageSummary {
  const tKey = todayKey();
  const mPrefix = tKey.slice(0, 7); // YYYY-MM
  let today = 0;
  let month = 0;
  let total = 0;
  const features = new Map<string, number>();

  for (const e of entries) {
    const cost = e.cost || 0;
    total += cost;
    const dayKey = e.ts.slice(0, 10);
    if (dayKey === tKey) today += cost;
    if (e.ts.slice(0, 7) === mPrefix) month += cost;
    features.set(e.feature, (features.get(e.feature) ?? 0) + cost);
  }

  const byFeature = [...features.entries()]
    .map(([feature, cost]) => ({ feature, cost }))
    .sort((a, b) => b.cost - a.cost);

  return { today, month, total, count: entries.length, byFeature };
}

// Compact USD formatting that stays useful at tiny amounts.
export function fmtUsd(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}
