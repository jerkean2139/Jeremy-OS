// Calendar domain helpers on top of the iCal parser: a serializable event
// shape for the client, day windowing, meeting classification, and a simple
// overload read. Pure functions so they're reusable across the route + UI.

import { type IcalEvent } from "./ical";

// Serializable (Dates → ISO strings) for crossing the API boundary.
export interface CalEvent {
  uid: string;
  summary: string;
  start: string; // ISO
  end?: string; // ISO
  allDay: boolean;
  location?: string;
  description?: string;
  attendees: number;
  isMeeting: boolean;
}

export function toCalEvent(e: IcalEvent): CalEvent {
  const isMeeting = e.attendees > 0 || /\b(call|meeting|sync|1:1|standup|interview|demo|zoom|meet)\b/i.test(e.summary);
  return {
    uid: e.uid,
    summary: e.summary,
    start: e.start.toISOString(),
    end: e.end?.toISOString(),
    allDay: e.allDay,
    location: e.location,
    description: e.description?.slice(0, 400),
    attendees: e.attendees,
    isMeeting,
  };
}

export function dayWindow(d: Date): { from: Date; to: Date } {
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  return { from, to };
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function fmtRange(e: CalEvent): string {
  if (e.allDay) return "All day";
  const start = fmtTime(e.start);
  return e.end ? `${start}–${fmtTime(e.end)}` : start;
}

// Minutes of back-to-back meeting time and the largest gap, for an overload read.
export interface OverloadRead {
  meetingCount: number;
  meetingMinutes: number;
  backToBack: number; // count of transitions with < 10 min gap
  overloaded: boolean;
}

export function overloadRead(events: CalEvent[]): OverloadRead {
  const meetings = events
    .filter((e) => e.isMeeting && !e.allDay && e.end)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));
  let minutes = 0;
  let backToBack = 0;
  for (let i = 0; i < meetings.length; i++) {
    const m = meetings[i];
    minutes += (+new Date(m.end!) - +new Date(m.start)) / 60000;
    if (i > 0) {
      const gap = (+new Date(m.start) - +new Date(meetings[i - 1].end!)) / 60000;
      if (gap < 10) backToBack++;
    }
  }
  const overloaded = meetings.length >= 5 || minutes >= 240 || backToBack >= 3;
  return { meetingCount: meetings.length, meetingMinutes: Math.round(minutes), backToBack, overloaded };
}

// A compact text rendering of a day's agenda for the coach context.
export function agendaText(events: CalEvent[]): string {
  if (!events.length) return "No calendar events.";
  return events
    .map((e) => `- ${fmtRange(e)} ${e.summary}${e.isMeeting ? " [meeting]" : ""}${e.location ? ` @ ${e.location}` : ""}`)
    .join("\n");
}
