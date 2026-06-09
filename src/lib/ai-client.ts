// Client-side helpers that call the AI routes and meter their estimated cost
// into the store, so the cost meter reflects real usage from one place.

import { useStore } from "./store";
import { chatCost, ttsCost, transcribeCost } from "./ai-pricing";

interface OpenAiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface CoachResponse {
  reply?: string;
  source?: string;
  model?: string;
  usage?: OpenAiUsage;
  [k: string]: unknown;
}

// POST /api/coach and record the metered cost (only when the model actually
// ran — local/offline replies carry no usage).
export async function askCoach(body: Record<string, unknown>, feature: string): Promise<CoachResponse> {
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: CoachResponse = await res.json();
  meterChat(feature, data.model, data.usage);
  return data;
}

// Record a chat-completion cost from an OpenAI usage object.
export function meterChat(feature: string, model?: string, usage?: OpenAiUsage) {
  if (!model || !usage) return;
  const inTok = usage.prompt_tokens ?? 0;
  const outTok = usage.completion_tokens ?? 0;
  if (inTok === 0 && outTok === 0) return;
  useStore.getState().recordAiUsage({
    feature,
    model,
    cost: chatCost(model, inTok, outTok),
    inputTokens: inTok,
    outputTokens: outTok,
  });
}

export function meterTts(model: string, chars: number) {
  if (!chars) return;
  useStore.getState().recordAiUsage({ feature: "tts", model, cost: ttsCost(chars), units: chars });
}

export function meterTranscribe(model: string, seconds: number) {
  if (!seconds) return;
  useStore
    .getState()
    .recordAiUsage({ feature: "transcribe", model, cost: transcribeCost(seconds), units: seconds });
}
