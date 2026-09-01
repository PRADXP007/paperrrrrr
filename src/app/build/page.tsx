"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDocumentContext } from "@/lib/DocumentContext";
import { Logo } from "@/components/ui/Logo";
import styles from "../page.module.css";
import { Loader } from "@/components/ui/Loader";

export default function BuildPage() {
  const router = useRouter();
  const { prompt, format, docType, setResearchBundle, setOutline, isInitialized, font, totalPages, color, audienceContext } = useDocumentContext();
  
  const [status, setStatus] = useState("Initializing intelligence build...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function runBuild() {
      if (!isInitialized) return;

      if (!prompt) {
        router.push("/");
        return;
      }

      try {
        // Step 1: Research
        setStatus("Gathering live web research and academic context...");
        const resResearch = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, depth: "standard", audienceContext }),
        });
        
        if (!resResearch.ok) throw new Error("Failed to gather research.");
        const { researchBundle: rb } = await resResearch.json();
        if (isMounted) setResearchBundle(rb);

        // Step 2: Outline
        setStatus("Formulating document structure and analyzing sources...");
        const resOutline = await fetch("/api/outline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, format, docType, researchBundle: rb, audienceContext, font, totalPages, color }),
        });

        if (!resOutline.ok) throw new Error("Failed to generate outline.");
        const { outline: out } = await resOutline.json();
        if (isMounted) setOutline(out);

        setStatus("Structure complete. Moving to workspace...");
        
        // Brief delay for UX so user can read the success state
        setTimeout(() => {
          if (isMounted) router.push("/workspace");
        }, 800);

      } catch (err: any) {
        if (isMounted) setError(err.message || "An unexpected error occurred.");
      }
    }

    runBuild();

    return () => { isMounted = false; };
  }, [prompt, format, docType, setResearchBundle, setOutline, router, isInitialized, font, totalPages, color, audienceContext]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Logo size="md" />
      </header>

      <main className={styles.main} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '500px', width: '100%', borderRadius: '16px' }}>
          {error ? (
            <div>
              <h2 style={{ color: 'red', marginBottom: '16px' }}>Build Error</h2>
              <p>{error}</p>
              <button 
                className={styles.submitBtn} 
                style={{ marginTop: '20px', width: '100%' }}
                onClick={() => router.push("/")}
              >
                Go Back
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <Loader />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 500 }}>
                {status}
              </h2>
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                Please wait while we formulate the {docType}.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
