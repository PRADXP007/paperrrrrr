"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught an error:", error);
  }, [error]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-default)", color: "var(--text-primary)", padding: "24px", textAlign: "center" }}>
      <ShieldAlert size={64} color="#f87171" style={{ marginBottom: "24px" }} />
      <h1 style={{ fontSize: "2rem", marginBottom: "16px" }}>Something went wrong</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "32px", maxWidth: "500px" }}>
        An unexpected error occurred in the application. Our systems have logged the issue.
      </p>
      <div style={{ display: "flex", gap: "16px" }}>
        <button 
          onClick={() => reset()}
          style={{ background: "var(--brand-accent)", color: "white", border: "none", padding: "12px 24px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem" }}
        >
          Try Again
        </button>
        <Link 
          href="/" 
          style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-light)", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontSize: "1rem" }}
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
