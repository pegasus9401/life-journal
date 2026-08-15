import type { Metadata } from "next";
import { AssistantPopup } from "@/features/assistant/components/assistant-popup";
import { ActiveWorkoutTracker } from "@/features/workouts/components/active-workout-tracker";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Дневник на живота",
  description: "Тихо място за спомените от живота, който живееш.",
  openGraph: {
    title: "Дневник на живота",
    description: "Дни, които си струва да запазиш.",
    images: [{ url: "/og.png", alt: "Дневник на живота — дни, които си струва да запазиш." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Дневник на живота",
    description: "Дни, които си струва да запазиш.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bg" suppressHydrationWarning>
      <body>{children}<ActiveWorkoutTracker /><AssistantPopup /></body>
    </html>
  );
}
