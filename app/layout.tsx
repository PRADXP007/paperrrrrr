import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paperrrrrr — Academic & Research Document Studio",
  description: "Research, structure, and assemble publication-grade IEEE papers, multi-chapter project reports, and executive presentation decks.",
  applicationName: "Paperrrrrr",
  authors: [{ name: "Paperrrrrr Studio" }],
  keywords: ["research papers", "IEEE formatting", "academic thesis builder", "Word docx generator", "PowerPoint presentation maker", "PDF builder", "Paperrrrrr"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0C111D] text-[#F8FAFC] antialiased min-h-screen flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
