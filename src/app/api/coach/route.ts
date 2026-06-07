import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// The AI Recovery Coach. Acts as coach, mirror, strategic advisor, and pattern
// detector — never a therapist, never diagnosing. Its job is to surface
// patterns between pressure, the Elevator, the Theater, productivity, sleep,
// weight, and mood. When no OPENAI_API_KEY is configured, a local reflection
// engine keeps the feature working offline.

const SYSTEM_PROMPT = `You are the coach inside "Jeremy OS", a personal operating system for a high-performing entrepreneur with ADHD who battles overwhelm, anxiety, and two private habits tracked with code words:
- "Elevator" = a substance habit; "Floors" = number of sessions.
- "Theater" = a compulsive habit; "Acts" = number of sessions.
- "Pressure" = anxiety level (1-10). "Mountain" = the single most important goal. "Noise" = distractions.

YOUR ROLE: coach, mirror, strategic advisor, and pattern detector.
YOU ARE NOT a therapist. You never diagnose, never give medical advice, never use clinical labels.

TONE: calm, direct, warm, like a trusted mentor — never a compliance officer. No guilt, no shame, no red-alert language. Only awareness and forward motion.

PRIMARY JOB: help him see patterns between Pressure, Elevator, Theater, productivity, sleep, weight, and mood — then point at the single next move that reduces noise and moves the mountain.

STYLE: short. Mobile-readable. 2-5 sentences unless asked for more. Speak to him as "you". End with awareness or one small action, not a lecture.`;

interface Body {
  mode?: "chat" | "summary" | "insight" | "memory" | "review";
  text?: string;
  messages?: { role: "user" | "assistant"; content: string }[];
  context?: string;
  memory?: string[];
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

  // --- Local fallback (no API key configured) ---
  if (!apiKey) {
    return NextResponse.json({ reply: localEngine(body), source: "local" });
  }

  try {
    const messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];
    if (body.memory?.length) {
      messages.push({
        role: "system",
        content: `What you remember about him (durable context from past sessions):\n${body.memory
          .map((m) => `- ${m}`)
          .join("\n")}`,
      });
    }
    if (body.context) {
      messages.push({ role: "system", content: `Recent data:\n${body.context}` });
    }
    if (body.mode === "memory") {
      messages.push({
        role: "user",
        content:
          "From everything above (our conversation and the data), write 1-3 short, durable facts worth remembering about me for future sessions — recurring patterns, triggers, what works, what matters. One per line, no bullets, no preamble, under 12 words each. Skip anything already obvious or trivial.",
      });
    } else if (body.mode === "summary") {
      messages.push({
        role: "user",
        content: `Reflect this morning check-in back in 2-3 calm sentences. Name the mountain and the pressure, then one grounding line.\n\n${body.text ?? ""}`,
      });
    } else if (body.mode === "insight") {
      messages.push({
        role: "user",
        content: `Looking at the data above, surface ONE proactive insight he hasn't asked for — the single most useful thing to notice today. 2-3 calm sentences, then one small concrete action. No greeting, no preamble, no shame. ${
          body.text ? `A draft observation to refine (keep its meaning): ${body.text}` : ""
        }`,
      });
    } else if (body.mode === "review") {
      messages.push({
        role: "user",
        content: `Write a short weekly reflection (3-4 calm sentences) from the data above. Name one genuine win, one pattern worth carrying forward, and one focus for next week. Warm and direct, no scorecard, no shame. ${
          body.text ? `Facts to ground it in: ${body.text}` : ""
        }`,
      });
    } else if (body.messages?.length) {
      messages.push(...body.messages);
    } else if (body.text) {
      messages.push({ role: "user", content: body.text });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ reply: localEngine(body), source: "local-fallback" });
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() ?? localEngine(body);
    return NextResponse.json({ reply, source: "openai" });
  } catch {
    return NextResponse.json({ reply: localEngine(body), source: "local-fallback" });
  }
}

// A lightweight, rule-based mentor voice for offline use.
function localEngine(body: Body): string {
  if (body.mode === "summary") {
    const t = (body.text ?? "").replace(/\n+/g, " ").trim();
    if (!t) return "A quiet start. Name your mountain, name the pressure, then take the first step.";
    return `Here's your morning, reflected back: ${t}. One mountain. Let the rest be noise. Take the first small step now.`;
  }

  // For insights, the deterministic engine already wrote a good line — pass it through.
  if (body.mode === "insight") {
    return (body.text ?? "").trim() || "Steady as you are. Pick one Mountain step and take it now.";
  }

  // Memory extraction needs the model; offline we don't invent facts.
  if (body.mode === "memory") {
    return "";
  }

  // Weekly review: offline, lean on the facts the engine already assembled.
  if (body.mode === "review") {
    const t = (body.text ?? "").replace(/\n+/g, " ").trim();
    return t
      ? `Here's your week, plainly: ${t} Carry the win forward, and let the rest be noise.`
      : "A quiet week on the page. Name one win, one pattern, and one mountain for the days ahead.";
  }

  const last =
    body.messages?.filter((m) => m.role === "user").slice(-1)[0]?.content ??
    body.text ??
    "";
  const lower = last.toLowerCase();

  if (!last.trim()) {
    return "I'm here. What's the pressure right now, and what's the one mountain you're trying to move today?";
  }
  if (/overwhelm|too much|everything|chaos|noise/.test(lower)) {
    return "That's the noise talking. Name the single mountain — just one. Everything else can wait an hour. What's the one thing that, if done, makes today count?";
  }
  if (/elevator|floor|thc|high/.test(lower)) {
    return "No judgment — just notice the pattern. What was the pressure level right before? Most Elevator rides start as a way to dodge a feeling, not chase one. What were you avoiding?";
  }
  if (/theater|act|porn/.test(lower)) {
    return "Logged, privately, no shame. The Theater usually follows pressure or fatigue. What was the trigger, and what did you actually need in that moment?";
  }
  if (/tired|exhausted|sleep|fatigue/.test(lower)) {
    return "Sleep is upstream of almost everything here — pressure, focus, the Elevator. Protect it tonight. What's one thing you can cut to get to bed earlier?";
  }
  if (/anxious|anxiety|pressure|stressed|stress|fear/.test(lower)) {
    return "Let's locate it. Is the pressure financial, client, team, or future? Naming the source shrinks it. Then we pick one move against it.";
  }
  if (/launch|manumation|funnel|summit/.test(lower)) {
    return "Good — that's the mountain. What's the single next action that shortens the distance to launch? Not the plan, the next click.";
  }
  return "I hear you. Here's the question worth sitting with: what's the pattern underneath this, and what's the smallest move that points you back at the mountain?";
}
