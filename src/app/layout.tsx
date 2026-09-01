import type { Metadata } from "next";
import "./globals.css";

import { DocumentProvider } from "@/lib/DocumentContext";

import { AuthProvider } from "@/lib/AuthContext";

import { GoogleOAuthProvider } from "@react-oauth/google";

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
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
          <AuthProvider>
            <DocumentProvider>
              {children}
            </DocumentProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
