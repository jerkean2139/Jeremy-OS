"use client";

import Link from "next/link";
import {
  Mountain,
  CalendarDays,
  BarChart3,
  CalendarCheck,
  Search,
  BookOpen,
  Route,
  Repeat,
  ListChecks,
  Database,
  BellRing,
  Gauge,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

interface Item {
  href: string;
  label: string;
  sub: string;
  icon: LucideIcon;
}

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "Mountain & plan",
    items: [
      { href: "/manumation", label: "Summit", sub: "Distance to launch", icon: Mountain },
      { href: "/day", label: "My day", sub: "Calendar, briefing & plan", icon: CalendarDays },
    ],
  },
  {
    title: "Insight",
    items: [
      { href: "/analytics", label: "Patterns", sub: "Trends & correlations", icon: BarChart3 },
      { href: "/review", label: "Review", sub: "Weekly reflection", icon: CalendarCheck },
      { href: "/search", label: "Search", sub: "Find anything you've logged", icon: Search },
      { href: "/usage", label: "AI spend", sub: "Metered cost", icon: Gauge },
    ],
  },
  {
    title: "Daily",
    items: [
      { href: "/scripture", label: "Daily Word", sub: "One-year Bible plan", icon: BookOpen },
      { href: "/movement", label: "Movement", sub: "Steps & miles", icon: Route },
      { href: "/habits", label: "Habits", sub: "Build & break, the 4 laws", icon: Repeat },
      { href: "/scorecard", label: "Scorecard", sub: "Awareness inventory", icon: ListChecks },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/reminders", label: "Reminders", sub: "Nudges & timing", icon: BellRing },
      { href: "/backup", label: "Backup & sync", sub: "Export, import, cloud", icon: Database },
    ],
  },
];

export default function MorePage() {
  return (
    <div>
      <PageHeader title="More" subtitle="Everything else, in one place" />
      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
              {section.title}
            </div>
            <div className="overflow-hidden rounded-2xl border border-ink-700/60">
              {section.items.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cnRow(i)}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-800/70">
                    <item.icon className="h-5 w-5 text-mist-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-mist-100">{item.label}</div>
                    <div className="text-xs text-mist-500">{item.sub}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-mist-600" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function cnRow(i: number): string {
  return [
    "flex items-center gap-3 bg-ink-900/40 px-3 py-3 transition-colors hover:bg-ink-800/50",
    i > 0 ? "border-t border-ink-800/70" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
