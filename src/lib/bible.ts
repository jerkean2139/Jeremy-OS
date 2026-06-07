// The one-year Bible reading plan (Old Testament + New Testament each day).
//
// Pure, deterministic, and shared by client and server. The whole Bible is
// split across PLAN_DAYS so that both Testaments finish together in a year:
// the OT (929 chapters) reads ~2-3 chapters/day, the NT (260 chapters) ~1.
// The plan is self-paced — "day" is how far you've read, not the calendar —
// so there's never a "you're behind" guilt trip. Awareness over compliance.

export interface Book {
  name: string;
  testament: "OT" | "NT";
  chapters: number;
}

// Protestant canon, 66 books, in canonical order.
export const BOOKS: Book[] = [
  { name: "Genesis", testament: "OT", chapters: 50 },
  { name: "Exodus", testament: "OT", chapters: 40 },
  { name: "Leviticus", testament: "OT", chapters: 27 },
  { name: "Numbers", testament: "OT", chapters: 36 },
  { name: "Deuteronomy", testament: "OT", chapters: 34 },
  { name: "Joshua", testament: "OT", chapters: 24 },
  { name: "Judges", testament: "OT", chapters: 21 },
  { name: "Ruth", testament: "OT", chapters: 4 },
  { name: "1 Samuel", testament: "OT", chapters: 31 },
  { name: "2 Samuel", testament: "OT", chapters: 24 },
  { name: "1 Kings", testament: "OT", chapters: 22 },
  { name: "2 Kings", testament: "OT", chapters: 25 },
  { name: "1 Chronicles", testament: "OT", chapters: 29 },
  { name: "2 Chronicles", testament: "OT", chapters: 36 },
  { name: "Ezra", testament: "OT", chapters: 10 },
  { name: "Nehemiah", testament: "OT", chapters: 13 },
  { name: "Esther", testament: "OT", chapters: 10 },
  { name: "Job", testament: "OT", chapters: 42 },
  { name: "Psalms", testament: "OT", chapters: 150 },
  { name: "Proverbs", testament: "OT", chapters: 31 },
  { name: "Ecclesiastes", testament: "OT", chapters: 12 },
  { name: "Song of Solomon", testament: "OT", chapters: 8 },
  { name: "Isaiah", testament: "OT", chapters: 66 },
  { name: "Jeremiah", testament: "OT", chapters: 52 },
  { name: "Lamentations", testament: "OT", chapters: 5 },
  { name: "Ezekiel", testament: "OT", chapters: 48 },
  { name: "Daniel", testament: "OT", chapters: 12 },
  { name: "Hosea", testament: "OT", chapters: 14 },
  { name: "Joel", testament: "OT", chapters: 3 },
  { name: "Amos", testament: "OT", chapters: 9 },
  { name: "Obadiah", testament: "OT", chapters: 1 },
  { name: "Jonah", testament: "OT", chapters: 4 },
  { name: "Micah", testament: "OT", chapters: 7 },
  { name: "Nahum", testament: "OT", chapters: 3 },
  { name: "Habakkuk", testament: "OT", chapters: 3 },
  { name: "Zephaniah", testament: "OT", chapters: 3 },
  { name: "Haggai", testament: "OT", chapters: 2 },
  { name: "Zechariah", testament: "OT", chapters: 14 },
  { name: "Malachi", testament: "OT", chapters: 4 },
  { name: "Matthew", testament: "NT", chapters: 28 },
  { name: "Mark", testament: "NT", chapters: 16 },
  { name: "Luke", testament: "NT", chapters: 24 },
  { name: "John", testament: "NT", chapters: 21 },
  { name: "Acts", testament: "NT", chapters: 28 },
  { name: "Romans", testament: "NT", chapters: 16 },
  { name: "1 Corinthians", testament: "NT", chapters: 16 },
  { name: "2 Corinthians", testament: "NT", chapters: 13 },
  { name: "Galatians", testament: "NT", chapters: 6 },
  { name: "Ephesians", testament: "NT", chapters: 6 },
  { name: "Philippians", testament: "NT", chapters: 4 },
  { name: "Colossians", testament: "NT", chapters: 4 },
  { name: "1 Thessalonians", testament: "NT", chapters: 5 },
  { name: "2 Thessalonians", testament: "NT", chapters: 3 },
  { name: "1 Timothy", testament: "NT", chapters: 6 },
  { name: "2 Timothy", testament: "NT", chapters: 4 },
  { name: "Titus", testament: "NT", chapters: 3 },
  { name: "Philemon", testament: "NT", chapters: 1 },
  { name: "Hebrews", testament: "NT", chapters: 13 },
  { name: "James", testament: "NT", chapters: 5 },
  { name: "1 Peter", testament: "NT", chapters: 5 },
  { name: "2 Peter", testament: "NT", chapters: 3 },
  { name: "1 John", testament: "NT", chapters: 5 },
  { name: "2 John", testament: "NT", chapters: 1 },
  { name: "3 John", testament: "NT", chapters: 1 },
  { name: "Jude", testament: "NT", chapters: 1 },
  { name: "Revelation", testament: "NT", chapters: 22 },
];

export const PLAN_DAYS = 365;

export interface ChapterRef {
  book: string;
  chapter: number;
}

function flatten(testament: "OT" | "NT"): ChapterRef[] {
  const out: ChapterRef[] = [];
  for (const b of BOOKS) {
    if (b.testament !== testament) continue;
    for (let c = 1; c <= b.chapters; c++) out.push({ book: b.name, chapter: c });
  }
  return out;
}

const OT_CHAPTERS = flatten("OT"); // 929
const NT_CHAPTERS = flatten("NT"); // 260

// Group a contiguous run of chapters into readable references, e.g.
// [Genesis 49, Genesis 50, Exodus 1] -> ["Genesis 49-50", "Exodus 1"].
function toRefs(chapters: ChapterRef[]): string[] {
  const refs: string[] = [];
  let i = 0;
  while (i < chapters.length) {
    const book = chapters[i].book;
    const start = chapters[i].chapter;
    let end = start;
    let j = i + 1;
    while (j < chapters.length && chapters[j].book === book && chapters[j].chapter === end + 1) {
      end = chapters[j].chapter;
      j++;
    }
    refs.push(start === end ? `${book} ${start}` : `${book} ${start}-${end}`);
    i = j;
  }
  return refs;
}

function slice(pool: ChapterRef[], day: number): ChapterRef[] {
  // Even, contiguous distribution across the year. We round boundaries up so
  // day one opens with both Testaments (Genesis 1 + Matthew 1); the NT has
  // fewer chapters than there are days, so its unavoidable lighter days fall
  // near the end rather than at the start.
  const start = Math.ceil(((day - 1) * pool.length) / PLAN_DAYS);
  const end = Math.ceil((day * pool.length) / PLAN_DAYS);
  return pool.slice(start, end);
}

export interface PlanPortion {
  refs: string[]; // human references, e.g. ["Genesis 1-3"]
  label: string; // refs joined for display
  chapters: ChapterRef[]; // flat list for fetching text
}

export interface DayReading {
  day: number; // 1-based
  total: number; // PLAN_DAYS
  ot: PlanPortion;
  nt: PlanPortion;
}

function portion(chapters: ChapterRef[]): PlanPortion {
  const refs = toRefs(chapters);
  return { refs, label: refs.join("; "), chapters };
}

export function clampDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(PLAN_DAYS, Math.max(1, Math.floor(day)));
}

export function readingForDay(day: number): DayReading {
  const d = clampDay(day);
  return {
    day: d,
    total: PLAN_DAYS,
    ot: portion(slice(OT_CHAPTERS, d)),
    nt: portion(slice(NT_CHAPTERS, d)),
  };
}

// A short label combining both testaments, for the dashboard card.
export function readingLabel(day: number): string {
  const r = readingForDay(day);
  return [r.ot.label, r.nt.label].filter(Boolean).join("  ·  ");
}
