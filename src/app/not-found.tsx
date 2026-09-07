import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-default)", color: "var(--text-primary)", padding: "24px", textAlign: "center" }}>
      <SearchX size={64} color="#60a5fa" style={{ marginBottom: "24px" }} />
      <h1 style={{ fontSize: "2rem", marginBottom: "16px" }}>Page Not Found</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "32px", maxWidth: "500px" }}>
        We couldn't find the page you were looking for. It might have been moved or doesn't exist.
      </p>
      <Link 
        href="/" 
        style={{ background: "var(--brand-accent)", color: "white", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontSize: "1rem" }}
      >
        Return Home
      </Link>
    </div>
  );
}
