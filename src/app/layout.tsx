import type { Metadata } from "next";
import "./globals.css";

import { DocumentProvider } from "@/lib/DocumentContext";

export const metadata: Metadata = {
  title: "Paperrrrrr - Document Studio",
  description: "Academic & Research Document Studio for IEEE papers, multi-chapter project reports, and presentation decks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <DocumentProvider>
          {children}
        </DocumentProvider>
      </body>
    </html>
  );
}
