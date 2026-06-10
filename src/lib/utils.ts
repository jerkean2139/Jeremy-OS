import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayKey(d: Date = new Date()): string {
  // Local-date ISO key (YYYY-MM-DD), avoiding UTC drift.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateKey(d: Date): string {
  return todayKey(d);
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function pressureColor(level: number): string {
  if (level <= 3) return "text-sage-400";
  if (level <= 6) return "text-ember-400";
  return "text-ember-500";
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Split long text into speakable chunks (≤ maxLen), breaking on sentence
// boundaries where possible so the audio sounds natural and never truncates.
export function chunkText(text: string, maxLen = 500): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean ? [clean] : [];
  const sentences = clean.match(/[^.!?]+[.!?]+|\S+$/g) ?? [clean];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).trim().length > maxLen && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur = (cur + " " + s).trim();
    }
    // A single sentence longer than maxLen: hard-split it.
    while (cur.length > maxLen) {
      chunks.push(cur.slice(0, maxLen).trim());
      cur = cur.slice(maxLen);
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}
