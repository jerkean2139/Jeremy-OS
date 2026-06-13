"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Timer, MessageCircle, Headphones, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Today", icon: Home },
  { href: "/pulse", label: "Pulse", icon: Timer },
  { href: "/audio", label: "Audio", icon: Headphones },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/more", label: "More", icon: LayoutGrid },
];

// Pages that live inside the "More" hub — keep that tab lit while you're there.
const MORE_ROUTES = [
  "/more",
  "/manumation",
  "/analytics",
  "/review",
  "/search",
  "/scripture",
  "/movement",
  "/habits",
  "/scorecard",
  "/reminders",
  "/backup",
  "/usage",
  "/day",
];

export function BottomNav() {
  const pathname = usePathname();
  // No navigation chrome on the lock screen.
  if (pathname === "/unlock") return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700/60 bg-ink-900/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/more"
              ? MORE_ROUTES.some((r) => pathname.startsWith(r))
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] transition-colors",
                active ? "text-mist-50" : "text-mist-500 hover:text-mist-200"
              )}
            >
              <Icon
                className={cn("h-5 w-5", active && "text-sage-400")}
                strokeWidth={active ? 2.2 : 1.8}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
