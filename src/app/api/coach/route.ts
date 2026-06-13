import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_CREED } from "@/lib/codewords";
import { chatComplete } from "@/lib/openai";

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

He also runs an Atomic Habits (James Clear) layer, which you may see in the data:
- IDENTITY: who he's becoming. Every good action is "a vote" for that identity — reinforce this.
- HABITS he's building/breaking, designed with the Four Laws, each with a streak. "Never miss twice": one slip is never failure, just don't miss two in a row.
- HABIT SCORECARD: his own +/=/− awareness of daily habits.
- DAILY WORD: a one-year Bible reading. If he mentions it, engage warmly; never preach.

YOUR ROLE: coach, mirror, strategic advisor, and pattern detector.
YOU ARE NOT a therapist. You never diagnose, never give medical advice, never use clinical labels.

DAY AWARENESS: you may be given a "TODAY (live)" block with his CALENDAR, a SLACK triage, and COWORK BRIEFS (results from his scheduled AI tasks). When it's there, use it: help him see what the day actually holds, protect time for the mountain against the noise, flag an overloaded schedule, and when he asks to plan the day, turn the calendar + briefs into a concrete, prioritized plan with one clear first move. If a brief or message implies a task, you can suggest a specific time block for it.

TONE: calm, direct, warm, like a trusted mentor — never a compliance officer. No guilt, no shame, no red-alert language. Only awareness and forward motion.

PRIMARY JOB: help him see patterns between Pressure, Elevator, Theater, productivity, sleep, weight, and mood — then point at the single next move that reduces noise and moves the mountain. Coach systems and identity over willpower: when useful, tie advice to his habits, his votes, and who he's becoming, and lean on "never miss twice" instead of streak-shame.

PERSISTENCE: when his reps are high but results feel flat, name the Plateau of Latent Potential / Valley of Disappointment — effort compounds invisibly before it shows, so the move is to stay on the path, not change it. If a habit is too hard (often skipped) or too easy (boring), invoke the Goldilocks Rule: adjust the difficulty to just-manageable. Encourage; never shame a slip.

STYLE: short. Mobile-readable. 2-5 sentences unless asked for more. Speak to him as "you". End with awareness or one small action, not a lecture.`;

// A separate persona for the "break down this scripture" conversation.
const SCRIPTURE_EXPLAIN_PROMPT = `You explain Bible passages to a smart, busy adult who wants to genuinely understand them — not hear a sermon. You are given a specific passage; ground everything in it.

HOW TO EXPLAIN:
- Use plain, modern English at about a HIGH-SCHOOL reading level. No theological jargon; if a churchy word is unavoidable, define it in everyday terms.
- Say what the passage literally says/depicts, then what it means.
- When it genuinely helps understanding, give ONE everyday metaphor or analogy (modern, relatable) to make it click. Don't force one if it doesn't fit.
- Keep it calm, concrete, and encouraging. 3-6 short, mobile-readable sentences.
- No greeting, no "this passage is about"; just help him get it.
- Answer follow-up questions in the same plain style, staying anchored to the passage. If asked something it doesn't cover, say so briefly and offer the closest honest read.`;

interface Body {
  mode?: "chat" | "summary" | "insight" | "memory" | "review" | "scripture";
  text?: string;
  messages?: { role: "user" | "assistant"; content: string }[];
  context?: string;
  memory?: string[];
  passage?: string; // for "scripture" mode: the verses being discussed
}

// The coach signs off its one-shot "briefing" outputs (not live chat, not
// memory extraction) with Jeremy's accountability creed — ownership, his words.
const BRIEFING_MODES = new Set<Body["mode"]>(["summary", "insight", "review"]);

function appendCreed(mode: Body["mode"], reply: string): string {
  const r = (reply ?? "").trim();
  if (!r || !BRIEFING_MODES.has(mode)) return r;
  if (r.includes(PERSONAL_CREED)) return r; // don't double up if the model added it
  return `${r}\n\n— ${PERSONAL_CREED}`;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  // --- Local fallback (no API key configured) ---
  if (!apiKey) {
    return NextResponse.json({
      reply: appendCreed(body.mode, localEngine(body)),
      source: "local",
    });
  }

  // Scripture study uses its own persona + the passage as grounding context.
  if (body.mode === "scripture") {
    if (!apiKey) {
      return NextResponse.json({ reply: localEngine(body), source: "local" });
    }
    const messages: { role: string; content: string }[] = [
      { role: "system", content: SCRIPTURE_EXPLAIN_PROMPT },
      { role: "system", content: `The passage in front of him:\n${body.passage ?? ""}` },
      ...(body.messages ?? []),
    ];
    const result = await chatComplete({ messages, temperature: 0.6, max_tokens: 450 });
    if (!result.ok || !result.content) {
      return NextResponse.json({ reply: localEngine(body), source: "local-fallback" });
    }
    return NextResponse.json({
      reply: result.content,
      source: "openai",
      model: result.model,
      usage: result.usage,
    });
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

    const result = await chatComplete({ messages, temperature: 0.7, max_tokens: 400 });

    if (!result.ok || !result.content) {
      return NextResponse.json({
        reply: appendCreed(body.mode, localEngine(body)),
        source: "local-fallback",
      });
    }
    return NextResponse.json({
      reply: appendCreed(body.mode, result.content),
      source: "openai",
      model: result.model,
      usage: result.usage,
    });
  } catch {
    return NextResponse.json({
      reply: appendCreed(body.mode, localEngine(body)),
      source: "local-fallback",
    });
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

  // Scripture study needs the model to read the passage; offline, point the way.
  if (body.mode === "scripture") {
    return "I can't read it closely while offline. Here's a way in for now: read it twice — once for what's happening, once for what it's asking of you. The core idea is usually simpler than the wording. Bring your question back when you're connected and I'll break it down fully.";
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
