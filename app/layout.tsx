import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paperrrrrr — Autonomous Research & Document Studio",
  description: "Research, write, and assemble real editable Word docs, PowerPoint presentations, Excel spreadsheets, and PDFs with Gemini 2.5 Flash.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
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
      <body className="bg-[#FAF9F5] text-[#1B1C1A] antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
