// Shared OpenAI chat-completions helper with model fallback. Like the TTS
// route, it tries the preferred model first and falls back to a widely
// available one, so a model-access gap can't silently drop the whole feature
// to its offline/generic fallback. Returns a normalized result.

interface ChatOpts {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  timeoutMs?: number;
}

export interface ChatResult {
  ok: boolean;
  content?: string;
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: string;
}

// Preferred model (OPENAI_MODEL) first, then dependable fallbacks. De-duped.
export function chatModelChain(): string[] {
  const preferred = process.env.OPENAI_MODEL || "gpt-4o-mini";
  return [...new Set([preferred, "gpt-4o-mini", "gpt-4o"])];
}

export async function chatComplete(opts: ChatOpts): Promise<ChatResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "no_key" };

  for (const model of chatModelChain()) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 12000);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: opts.messages,
          temperature: opts.temperature ?? 0.6,
          max_tokens: opts.max_tokens ?? 400,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        console.error("[openai] model error", model, res.status, await res.text().catch(() => ""));
        continue; // try the next model
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) continue;
      return { ok: true, content, model, usage: data.usage };
    } catch (err) {
      console.error("[openai] request failed", model, err);
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, error: "all_failed" };
}
