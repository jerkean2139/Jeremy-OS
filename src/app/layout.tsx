import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { PulseNudge } from "@/components/PulseNudge";
import { PWARegister } from "@/components/PWARegister";
import { SyncProvider } from "@/components/SyncProvider";
import { Onboarding } from "@/components/Onboarding";

export const metadata: Metadata = {
  title: "Jeremy OS",
  description: "Reduce noise. Increase clarity. Move the mountain.",
  manifest: "/manifest.json",
  applicationName: "Jeremy OS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jeremy OS",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <PWARegister />
        <SyncProvider />
        <main className="mx-auto min-h-[100dvh] w-full max-w-lg px-4 pb-28 pt-[max(env(safe-area-inset-top),1.25rem)]">
          {children}
        </main>
        <BottomNav />
        <PulseNudge />
        <Onboarding />
      </body>
    </html>
  );
}
