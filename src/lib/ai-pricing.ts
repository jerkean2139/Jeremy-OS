// Estimated OpenAI pricing so the app can meter its own spend the way OpenAI
// bills — from token/character/second usage. These are approximate USD rates
// and easy to adjust as pricing changes; the meter labels itself "estimated".
//
// Chat rates are USD per 1,000,000 tokens (input / output).

export interface ChatRate {
  input: number;
  output: number;
}

export const CHAT_PRICING: Record<string, ChatRate> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "gpt-5": { input: 1.25, output: 10 },
  "gpt-5-mini": { input: 0.25, output: 2 },
  "gpt-5.4": { input: 1.25, output: 10 },
  "gpt-5.4-mini": { input: 0.25, output: 2 },
  "o4-mini": { input: 1.1, output: 4.4 },
};

// Used when the configured model isn't in the table (so the meter still moves).
export const DEFAULT_CHAT_RATE: ChatRate = { input: 0.5, output: 1.5 };

// TTS billed per 1M characters of input; transcription per minute of audio.
export const TTS_RATE_PER_MCHAR = 15; // ~tts-1 / gpt-4o-mini-tts ballpark
export const TRANSCRIBE_RATE_PER_MIN = 0.006; // whisper / gpt-4o-mini-transcribe

export function chatRate(model: string): ChatRate {
  if (CHAT_PRICING[model]) return CHAT_PRICING[model];
  // Fall back to the longest known key that prefixes the model id.
  const key = Object.keys(CHAT_PRICING)
    .filter((k) => model.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return key ? CHAT_PRICING[key] : DEFAULT_CHAT_RATE;
}

export function chatCost(model: string, inputTokens: number, outputTokens: number): number {
  const r = chatRate(model);
  return (inputTokens * r.input + outputTokens * r.output) / 1_000_000;
}

export function ttsCost(chars: number): number {
  return (chars * TTS_RATE_PER_MCHAR) / 1_000_000;
}

export function transcribeCost(seconds: number): number {
  return (seconds / 60) * TRANSCRIBE_RATE_PER_MIN;
}
