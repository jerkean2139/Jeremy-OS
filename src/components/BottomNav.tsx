"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Timer, BarChart3, MessageCircle, Mountain } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Today", icon: Home },
  { href: "/pulse", label: "Pulse", icon: Timer },
  { href: "/manumation", label: "Summit", icon: Mountain },
  { href: "/analytics", label: "Patterns", icon: BarChart3 },
  { href: "/coach", label: "Coach", icon: MessageCircle },
];

export function BottomNav() {
  const pathname = usePathname();
  // No navigation chrome on the lock screen.
  if (pathname === "/unlock") return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700/60 bg-ink-900/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
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
