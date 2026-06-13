// Shared OpenAI chat-completions helper with model fallback. Like the TTS
// route, it tries the preferred model first and falls back to a widely
// available one, so a model-access gap can't silently drop the whole feature
// to its offline/generic fallback. Returns a normalized result.

interface ChatOpts {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  timeoutMs?: number;
  tools?: unknown[]; // OpenAI tool/function definitions (optional)
}

export interface ToolCall {
  name: string;
  arguments: string; // raw JSON string of the call args
}

export interface ChatResult {
  ok: boolean;
  content?: string;
  toolCalls?: ToolCall[];
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
          ...(opts.tools?.length ? { tools: opts.tools } : {}),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        console.error("[openai] model error", model, res.status, await res.text().catch(() => ""));
        continue; // try the next model
      }
      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      const content = msg?.content?.trim();
      const toolCalls: ToolCall[] = (msg?.tool_calls ?? [])
        .filter((c: { function?: { name?: string } }) => c.function?.name)
        .map((c: { function: { name: string; arguments: string } }) => ({
          name: c.function.name,
          arguments: c.function.arguments ?? "{}",
        }));
      // A tool-call-only reply has no content — still a valid result.
      if (!content && toolCalls.length === 0) continue;
      return { ok: true, content, toolCalls: toolCalls.length ? toolCalls : undefined, model, usage: data.usage };
    } catch (err) {
      console.error("[openai] request failed", model, err);
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, error: "all_failed" };
}

export interface AiStatus {
  configured: boolean; // OPENAI_API_KEY present
  ok: boolean; // a usable chat model is reachable
  keyValid?: boolean;
  preferred: string; // the model OPENAI_MODEL asks for
  model?: string; // the model that will actually be used
  preferredAvailable?: boolean;
  voice: boolean; // premium TTS available (key present)
  error?: "invalid_key" | "no_model" | "network" | "insufficient_quota" | string;
}

// A cheap, no-token health check: validates the key and which chat model is
// actually reachable via GET /v1/models, so the UI can say exactly what's wrong
// (missing key vs. rejected key vs. model not on this account).
export async function diagnoseOpenAI(): Promise<AiStatus> {
  const apiKey = process.env.OPENAI_API_KEY;
  const preferred = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const voice = !!apiKey;

  if (!apiKey) return { configured: false, ok: false, preferred, voice: false };

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (res.status === 401) {
      return { configured: true, ok: false, keyValid: false, preferred, voice, error: "invalid_key" };
    }
    if (res.status === 429) {
      return { configured: true, ok: false, keyValid: true, preferred, voice, error: "insufficient_quota" };
    }
    if (!res.ok) {
      return { configured: true, ok: false, keyValid: true, preferred, voice, error: `http_${res.status}` };
    }
    const data = await res.json();
    const ids = new Set<string>((data.data || []).map((m: { id: string }) => m.id));
    const usable = chatModelChain().find((m) => ids.has(m));
    return {
      configured: true,
      ok: !!usable,
      keyValid: true,
      preferred,
      model: usable,
      preferredAvailable: ids.has(preferred),
      voice,
      error: usable ? undefined : "no_model",
    };
  } catch {
    return { configured: true, ok: false, preferred, voice, error: "network" };
  }
}
