import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeSentinel",
  description: "AI coding security & observability console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
