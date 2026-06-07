// Server-only Slack reader for the 7am briefing.
//
// Uses a single user token (SLACK_TOKEN, an xoxp-… token from a Slack app
// installed to the workspace) to surface what actually needs attention:
// unread DMs, group DMs, channels, and recent @-mentions — then turns that
// noise into a calm, prioritized triage via the same OpenAI path the coach
// uses (with a graceful offline fallback). Single-user by design, like the
// rest of Jeremy OS. Never throws: partial failures degrade to partial data.

const SLACK_API = "https://slack.com/api";

// Keep the fan-out bounded — this runs at 7am for one person, but we still
// don't want to trip Slack's per-method rate limits.
const CAP_INFO = 50; // conversations.info lookups
const CAP_HISTORY = 20; // latest-message lookups for unread conversations

export interface SlackUnread {
  id: string;
  kind: "dm" | "group" | "channel";
  name: string; // "@alice" / "#general" / "group"
  count: number; // unread_count_display
  latest?: string; // latest message text, cleaned
  url: string; // deep link into Slack
}

export interface SlackMention {
  text: string;
  channel: string;
  ts: string;
  permalink?: string;
}

export interface SlackBriefingData {
  configured: boolean; // SLACK_TOKEN present
  ok: boolean; // auth + fetch succeeded
  error?: string;
  team?: string;
  teamId?: string;
  unreads: SlackUnread[];
  mentions: SlackMention[];
  digest?: string; // AI triage summary
  fetchedAt: string;
}

type Json = Record<string, any>;

async function call(
  method: string,
  token: string,
  params: Record<string, string | number | boolean> = {}
): Promise<Json> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  try {
    const res = await fetch(`${SLACK_API}/${method}?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return (await res.json()) as Json;
  } catch {
    return { ok: false, error: "network" };
  }
}

// Turn Slack's markup (<@U123>, <#C1|name>, <url|label>, &amp;) into plain text.
function clean(text: string, users: Map<string, string>): string {
  return (text || "")
    .replace(/<@([A-Z0-9]+)(\|[^>]+)?>/g, (_, id) => "@" + (users.get(id) || "user"))
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, (_, n) => "#" + n)
    .replace(/<(https?:[^>|]+)\|([^>]+)>/g, (_, __, label) => label)
    .replace(/<(https?:[^>]+)>/g, (_, u) => u)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

export async function getSlackBriefing(): Promise<SlackBriefingData> {
  const token = process.env.SLACK_TOKEN;
  const base: SlackBriefingData = {
    configured: !!token,
    ok: false,
    unreads: [],
    mentions: [],
    fetchedAt: new Date().toISOString(),
  };
  if (!token) return base;

  const auth = await call("auth.test", token);
  if (!auth.ok) {
    return { ...base, error: auth.error || "auth_failed" };
  }
  const uid = auth.user_id as string;
  const teamId = auth.team_id as string;
  const team = auth.team as string;

  // 1. List the conversations the user belongs to.
  let convos: Json[] = [];
  const list = await call("users.conversations", token, {
    types: "im,mpim,public_channel,private_channel",
    exclude_archived: true,
    limit: 200,
  });
  if (list.ok) convos = (list.channels as Json[]) || [];

  // 2. Unread counts come per-conversation from conversations.info (capped).
  const infos = await Promise.all(
    convos.slice(0, CAP_INFO).map((c) => call("conversations.info", token, { channel: c.id }))
  );
  const unreadChannels = infos
    .map((i) => (i.ok ? i.channel : null))
    .filter((ch: Json | null): ch is Json => !!ch && (ch.unread_count_display ?? 0) > 0)
    .sort((a, b) => (b.unread_count_display ?? 0) - (a.unread_count_display ?? 0));

  // 3. Resolve DM partner names.
  const userMap = new Map<string, string>();
  const dmUserIds = Array.from(
    new Set(unreadChannels.filter((ch) => ch.is_im && ch.user).map((ch) => ch.user as string))
  );
  await Promise.all(
    dmUserIds.map(async (id) => {
      const u = await call("users.info", token, { user: id });
      if (u.ok) {
        userMap.set(
          id,
          u.user.profile?.display_name || u.user.real_name || u.user.name || "someone"
        );
      }
    })
  );

  // 4. Latest message per unread conversation (capped).
  const unreads: SlackUnread[] = await Promise.all(
    unreadChannels.slice(0, CAP_HISTORY).map(async (ch): Promise<SlackUnread> => {
      let latest: string | undefined;
      const h = await call("conversations.history", token, { channel: ch.id, limit: 1 });
      if (h.ok && h.messages?.[0]) latest = clean(h.messages[0].text || "", userMap);
      const kind: SlackUnread["kind"] = ch.is_im ? "dm" : ch.is_mpim ? "group" : "channel";
      const name = ch.is_im
        ? `@${userMap.get(ch.user as string) || "dm"}`
        : ch.is_mpim
          ? "group message"
          : `#${ch.name}`;
      return {
        id: ch.id,
        kind,
        name,
        count: ch.unread_count_display ?? 0,
        latest,
        url: `https://app.slack.com/client/${teamId}/${ch.id}`,
      };
    })
  );

  // 5. Recent @-mentions (best effort — needs search:read).
  let mentions: SlackMention[] = [];
  const search = await call("search.messages", token, {
    query: `<@${uid}>`,
    count: 10,
    sort: "timestamp",
  });
  if (search.ok && search.messages?.matches) {
    mentions = (search.messages.matches as Json[]).map((m) => ({
      text: clean(m.text || "", userMap),
      channel: m.channel?.name ? `#${m.channel.name}` : m.channel?.id || "",
      ts: m.ts,
      permalink: m.permalink,
    }));
  }

  const digest = await summarize({ unreads, mentions });

  return {
    configured: true,
    ok: true,
    team,
    teamId,
    unreads,
    mentions,
    digest,
    fetchedAt: new Date().toISOString(),
  };
}

const DIGEST_PROMPT = `You are the calm coach inside "Jeremy OS". Below is Jeremy's unread Slack — DMs, group messages, channel backlog, and @-mentions. Slack is "Noise": your job is to help him triage it fast and get back to the Mountain (his one important goal).

Write a short, calm briefing: 2-3 sentences naming what actually needs a human reply (people first), then a tiny prioritized list (max 3 items) of who/what to handle first. Ignore bots, noise, and FYI chatter. No greeting, no preamble, no shame. If nothing truly needs him, say so and tell him to close Slack and climb.`;

async function summarize(d: {
  unreads: SlackUnread[];
  mentions: SlackMention[];
}): Promise<string | undefined> {
  const lines: string[] = [];
  for (const u of d.unreads) lines.push(`${u.name} (${u.count} unread): ${u.latest ?? ""}`);
  for (const m of d.mentions) lines.push(`Mention in ${m.channel}: ${m.text}`);
  const corpus = lines.join("\n").slice(0, 4000);

  const totalUnread = d.unreads.reduce((a, u) => a + u.count, 0);
  if (!corpus.trim()) {
    return "Slack is quiet — nothing's waiting on you. Close it and go move the mountain.";
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const m = d.mentions.length;
    return `${totalUnread} unread across ${d.unreads.length} conversation${
      d.unreads.length === 1 ? "" : "s"
    }${m ? `, ${m} mention${m === 1 ? "" : "s"}` : ""}. Triage the people first, reply where it matters, then close Slack and climb.`;
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: DIGEST_PROMPT },
          { role: "user", content: corpus },
        ],
        temperature: 0.5,
        max_tokens: 300,
      }),
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || undefined;
  } catch {
    return undefined;
  }
}
