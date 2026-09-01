"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDocumentContext } from "@/lib/DocumentContext";
import { Logo } from "@/components/ui/Logo";
import styles from "../page.module.css";
import { FileText, Download, CheckCircle2, Loader2, FileDown } from "lucide-react";

function LivePreview({ sections }: { sections: any[] }) {
  if (!sections || sections.length === 0) return null;
  
  return (
    <div style={{ padding: '24px', textAlign: 'left', width: '100%', height: '100%', overflowY: 'auto' }}>
      {sections.map((sec, idx) => (
        <div key={idx} style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--color-primary)' }}>{sec.title}</h2>
          {sec.content ? (
            sec.content.split("\n\n").map((para: string, pIdx: number) => {
              const trimmed = para.trim();
              if (!trimmed) return null;
              if (trimmed.startsWith("### ")) {
                return <h3 key={pIdx} style={{ fontSize: '1.2rem', marginTop: '24px', marginBottom: '12px' }}>{trimmed.replace(/^### /, "")}</h3>;
              }
              if (trimmed.startsWith("#### ")) {
                return <h4 key={pIdx} style={{ fontSize: '1.1rem', marginTop: '20px', marginBottom: '12px' }}>{trimmed.replace(/^#### /, "")}</h4>;
              }
              if (trimmed.startsWith("> ")) {
                return <blockquote key={pIdx} style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>{trimmed.replace(/^> /, "")}</blockquote>;
              }
              
              // Simple bold matcher
              const parts = trimmed.split(/(\*\*.*?\*\*)/g);
              
              return (
                <p key={pIdx} style={{ marginBottom: '12px', lineHeight: '1.6' }}>
                  {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={i}>{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  })}
                </p>
              );
            })
          ) : (
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
               <Loader2 size={14} className="animate-spin" /> Drafting section...
             </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function WorkspacePage() {
  const router = useRouter();
  const { prompt, format, docType, researchBundle, outline, finalSections, setFinalSections, isInitialized, font, totalPages, color, audienceContext } = useDocumentContext();
  
  const [streamStatus, setStreamStatus] = useState("Initializing stream...");
  const [isStreaming, setIsStreaming] = useState(true);
  const [isAssembling, setIsAssembling] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Auto-scroll the log container
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<Array<{ id: string; text: string; time: string }>>([]);
  const [liveSections, setLiveSections] = useState<any[]>(outline?.sections || outline?.chapters || []);

  const addLog = (text: string) => {
    setLogs((prev) => [...prev, { id: Math.random().toString(), text, time: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;
    let localFinalSections: any = outline?.sections || outline?.chapters || [];

    async function runStreamAndAssemble() {
      if (!isInitialized) return;

      if (!prompt || !outline) {
        router.push("/");
        return;
      }

      try {
        addLog("Connecting to generation stream...");
        const resStream = await fetch("/api/generate-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            format,
            docType,
            approvedOutline: outline,
            researchBundle,
            tone: "Scholarly Academic",
            audienceContext,
            totalPages,
            font,
            color
          }),
        });

        if (!resStream.ok || !resStream.body) throw new Error("Streaming failed");

        const reader = resStream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const streamLines = buffer.split("\n\n");
          buffer = streamLines.pop() || "";

          for (const line of streamLines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.replace(/^data: /, "").trim();
              if (!jsonStr) continue;
              try {
                const event = JSON.parse(jsonStr);
                if (event.type === "status") {
                  const msg = event.message || "Writing...";
                  setStreamStatus(msg);
                } else if (event.type === "section_done") {
                  const msg = `Drafted: ${event.title}`;
                  setStreamStatus(msg);
                  addLog(msg);
                  
                  if (isMounted) {
                    setLiveSections(prev => {
                      const newSections = [...prev];
                      if (event.index >= 0 && event.index < newSections.length) {
                        newSections[event.index] = { ...newSections[event.index], content: event.content };
                      }
                      return newSections;
                    });
                  }
                } else if (event.type === "complete") {
                  if (event.sections && event.sections.length > 0) {
                    localFinalSections = event.sections;
                    if (isMounted) setFinalSections(event.sections);
                  }
                }
              } catch (err) {}
            }
          }
        }

        if (isMounted) setIsStreaming(false);
        if (isMounted) setIsAssembling(true);
        addLog("Stream complete. Preparing for final assembly...");

        // Assemble phase
        const resAssemble = await fetch("/api/assemble", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format,
            title: outline.title || prompt,
            subtitle: outline.subtitle || "",
            docType: outline.docType || docType,
            sections: localFinalSections,
            selectedFont: font,
            accentColor: color
          }),
        });

        if (!resAssemble.ok) throw new Error("Assembly failed");

        const blob = await resAssemble.blob();
        const url = URL.createObjectURL(blob);
        
        if (isMounted) {
          setDownloadUrl(url);
          setDownloadFilename(`${(outline.title || prompt).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`);
          setIsAssembling(false);
          addLog("Assembly complete. Ready for download.");
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Generation error.");
        if (isMounted) setIsStreaming(false);
        if (isMounted) setIsAssembling(false);
      }
    }

    runStreamAndAssemble();

    return () => { isMounted = false; };
  }, [prompt, format, docType, outline, researchBundle, setFinalSections, router, isInitialized, font, totalPages, color, audienceContext]);

  return (
    <div className={styles.container} style={{ overflow: "hidden", display: "flex", flexDirection: "column", height: "100vh" }}>
      <header className={styles.header} style={{ flexShrink: 0, padding: "20px 40px" }}>
        <Logo size="md" />
        <div className={styles.headerRight}>
           <span className="font-semibold text-primary">Workspace Mode</span>
        </div>
      </header>

      <main style={{ display: 'flex', flex: 1, gap: '24px', padding: '0 40px 40px 40px', overflow: 'hidden' }}>
        
        {/* Left Column: Live Progress Stream */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#0d1117', border: '1px solid #30363d', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          {/* macOS Window Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f' }} />
            <div style={{ marginLeft: '12px', fontSize: '0.85rem', color: '#8b949e', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} /> build.log
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {logs.map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: '16px', color: '#c9d1d9' }}>
                <span style={{ color: '#8b949e', whiteSpace: 'nowrap', userSelect: 'none' }}>[{log.time}]</span>
                <span style={{ color: log.text.includes("Error") ? '#ff7b72' : log.text.includes("Complete") || log.text.includes("Drafted") ? '#7ee787' : '#c9d1d9' }}>{log.text}</span>
              </div>
            ))}
            {isStreaming && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-primary)', marginTop: '8px' }}>
                <Loader2 size={14} className="animate-spin" />
                <span>{streamStatus}</span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Right Column: Preview & Output */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: '16px', padding: '24px', position: 'relative' }}>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} /> Document Assembly
          </h2>
          
          <div style={{ 
            flex: 1, 
            backgroundColor: 'var(--color-bg)', 
            borderRadius: '8px', 
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center'
          }}>
            
            {error && (
              <div style={{ color: 'red' }}>
                <p>Failed to generate document: {error}</p>
                <button onClick={() => router.push("/")} className={styles.submitBtn} style={{ marginTop: '16px' }}>Start Over</button>
              </div>
            )}

            {!error && isStreaming && (
              <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                <LivePreview sections={liveSections} />
              </div>
            )}

            {!error && !isStreaming && isAssembling && (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <div style={{ opacity: 0.3, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <LivePreview sections={liveSections} />
                </div>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'var(--color-bg)', padding: '32px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Loader2 size={48} className="animate-spin text-primary" style={{ margin: '0 auto 16px auto' }} />
                  <p>Packaging {format.toUpperCase()} binary file...</p>
                </div>
              </div>
            )}

            {!error && !isStreaming && !isAssembling && downloadUrl && (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <div style={{ opacity: 0.1, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <LivePreview sections={liveSections} />
                </div>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'var(--color-bg)', padding: '48px', borderRadius: '24px', boxShadow: '0 16px 64px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '80%', maxWidth: '500px' }}>
                  <div style={{ 
                    width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255, 107, 0, 0.15)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' 
                  }}>
                    <CheckCircle2 size={40} />
                  </div>
                  
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>Generation Complete</h3>
                    <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Your {docType} is ready.</p>
                  </div>

                  <a 
                    href={downloadUrl} 
                    download={downloadFilename}
                    className={styles.submitBtn}
                    style={{ textDecoration: 'none', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '40px', width: 'auto', fontSize: '1.1rem' }}
                  >
                    <FileDown size={20} />
                    Download Document
                  </a>
                  
                  <button 
                    onClick={() => router.push("/")} 
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', textDecoration: 'underline', marginTop: '16px' }}
                  >
                    Create another document
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  );
}
