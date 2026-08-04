import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Life Journal",
  description: "A quiet place to remember the life you are living.",
  openGraph: {
    title: "Life Journal",
    description: "Days worth keeping.",
    images: [{ url: "/og.png", alt: "Life Journal — Days worth keeping." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Life Journal",
    description: "Days worth keeping.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
