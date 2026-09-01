import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import { AssistantPopup } from "@/features/assistant/components/assistant-popup";
import { ActiveWorkoutTracker } from "@/features/workouts/components/active-workout-tracker";
import { PwaHomeLauncher } from "@/components/pwa-home-launcher";
import "./globals.css";
import "../styles/pegasos-2.css";
import "../styles/pegasos-ios.css";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], display: "swap", variable: "--font-manrope" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#171521",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "PEGASOS",
  description: "Твоят личен LifeOS за деня, здравето, плановете и спомените.",
  manifest: "/pwa.webmanifest",
  applicationName: "PEGASOS",
  appleWebApp: {
    capable: true,
    title: "PEGASOS",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "PEGASOS",
    description: "Твоят живот, подреден и насочван от AI.",
    images: [{ url: "/og.png", alt: "PEGASOS - твоят личен LifeOS." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PEGASOS",
    description: "Твоят живот, подреден и насочван от AI.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bg" suppressHydrationWarning>
      <Script id="pwa-home-before-paint" strategy="beforeInteractive">{`(() => {
        const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        const path = window.location.pathname;
        if (standalone && path !== '/today' && path !== '/login') {
          window.location.replace('/today');
        }
      })();`}</Script>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={manrope.variable}>{children}<PwaHomeLauncher /><ActiveWorkoutTracker /><AssistantPopup /></body>
    </html>
  );
}
