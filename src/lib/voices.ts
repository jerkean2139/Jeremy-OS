// Browser speech-synthesis voice selection.
//
// The OS default `SpeechSynthesisVoice` is often the old robotic one (the
// "1980 cybervixen"). Modern platforms ship far more natural neural voices —
// we just have to find and prefer them. This module ranks the installed
// voices so the fallback always reaches for the best one available.

// Warm, natural voices to prefer, best-first. Matched as case-insensitive
// substrings against the voice name.
const PREFERRED = [
  "online (natural)", // Microsoft Edge neural voices, e.g. "Microsoft Aria Online (Natural)"
  "natural",
  "google us english",
  "google uk english female",
  "google", // Chrome / Android network voices
  "ava", // Apple premium (macOS/iOS)
  "samantha",
  "allison",
  "joelle",
  "zoe",
  "nathan",
  "evan",
  "siri",
  "enhanced",
  "premium",
];

// Old / novelty / robotic voices to avoid — these are the cybervixen culprits.
const BLOCKED = [
  "zarvox",
  "cellos",
  "bells",
  "bad news",
  "good news",
  "bahh",
  "bubbles",
  "boing",
  "jester",
  "organ",
  "trinoids",
  "whisper",
  "wobble",
  "albert",
  "fred",
  "ralph",
  "kathy",
  "junior",
  "deranged",
  "hysterical",
  "superstar",
  "novelty",
  "eloquence",
  "espeak",
];

export function isEnglish(v: SpeechSynthesisVoice): boolean {
  return v.lang?.toLowerCase().startsWith("en");
}

function isBlocked(name: string): boolean {
  const n = name.toLowerCase();
  return BLOCKED.some((b) => n.includes(b));
}

// All usable (English, non-novelty) voices, ranked best-first for the picker.
export function rankedVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const usable = voices.filter((v) => isEnglish(v) && !isBlocked(v.name));
  const score = (v: SpeechSynthesisVoice): number => {
    const n = v.name.toLowerCase();
    const idx = PREFERRED.findIndex((p) => n.includes(p));
    let s = idx === -1 ? 100 : idx; // lower is better
    if (!v.localService) s -= 0.5; // network voices tend to be the natural ones
    if (v.lang?.toLowerCase() === "en-us") s -= 0.25;
    return s;
  };
  return [...usable].sort((a, b) => score(a) - score(b));
}

// The single best voice, or null if speech synthesis has nothing usable yet.
export function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  preferredName?: string
): SpeechSynthesisVoice | null {
  if (preferredName) {
    const exact = voices.find((v) => v.name === preferredName);
    if (exact) return exact;
  }
  const ranked = rankedVoices(voices);
  if (ranked.length) return ranked[0];
  return voices.find(isEnglish) ?? voices[0] ?? null;
}

const STORAGE_KEY = "jos.voice";

export function loadVoicePreference(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(STORAGE_KEY) || undefined;
}

export function saveVoicePreference(name: string | undefined) {
  if (typeof window === "undefined") return;
  if (name) window.localStorage.setItem(STORAGE_KEY, name);
  else window.localStorage.removeItem(STORAGE_KEY);
}
