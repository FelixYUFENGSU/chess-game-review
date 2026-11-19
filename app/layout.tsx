import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Review",
  description: "A local, Stockfish-powered chess game review tool.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-cg-bg font-sans text-cg-text">{children}</body>
    </html>
  );
}
