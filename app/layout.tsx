import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life Journal",
  description: "A quiet place to remember the life you are living.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
