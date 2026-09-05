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
    <div style={{ padding: '24px 40px', textAlign: 'left', width: '100%', flex: 1, overflowY: 'auto', color: '#000', fontFamily: '"Times New Roman", Times, serif' }}>
      {sections.map((sec, idx) => (
        <div key={idx} style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#000' }}>{sec.title}</h2>
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
                return <blockquote key={pIdx} style={{ borderLeft: '3px solid var(--brand-accent)', paddingLeft: '16px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>{trimmed.replace(/^> /, "")}</blockquote>;
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
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
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
  const { prompt, format, docType, researchBundle, outline, finalSections, setFinalSections, isInitialized, font, totalPages, color, reportCategory, customChapterCount, additionalInstructions, customGeminiKey } = useDocumentContext();
  
  const [streamStatus, setStreamStatus] = useState("Initializing stream...");
  const [isStreaming, setIsStreaming] = useState(true);
  const [isAssembling, setIsAssembling] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState("");
  const [error, setError] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<Array<{ id: string; text: string; time: string }>>([]);
  const [liveSections, setLiveSections] = useState<any[]>(outline?.sections || outline?.chapters || []);
  const [typingBuffer, setTypingBuffer] = useState<string>("");
  const typingBufferRef = useRef<string>("");
  const [displayedText, setDisplayedText] = useState<string>("");
  const [downloadFormat, setDownloadFormat] = useState<"docx" | "pdf">("docx");

  const getSyncedSections = () => {
    if (!isStreaming) return finalSections && finalSections.length > 0 ? finalSections : liveSections;
    if (!displayedText.trim()) return outline?.sections || outline?.chapters || [];

    const parts = displayedText.split("\n\n### ");
    const synced: any[] = [];
    
    // First part is usually empty or pre-section text if it didn't start with ###
    if (parts.length > 0 && parts[0].trim() && !displayedText.startsWith("\n\n### ")) {
      // Just ignore anything before the first section
    }

    parts.forEach((part, index) => {
      if (!part.trim()) return;
      // If this is the very first chunk and it didn't start with "###", it's ignored above.
      // Now part looks like "1. Introduction\nThis is the content..."
      const breakIdx = part.indexOf("\n");
      if (breakIdx === -1) {
        synced.push({ title: part.trim(), content: "" });
      } else {
        const title = part.substring(0, breakIdx).trim();
        const content = part.substring(breakIdx + 1);
        synced.push({ title, content });
      }
    });

    // If we didn't parse anything (e.g. still typing), fallback to empty
    if (synced.length === 0) return [];
    
    return synced;
  };

  useEffect(() => {
    if (outline && (outline.sections || outline.chapters)) {
      setLiveSections((prev) => {
        const newOutlineSections = outline.sections || outline.chapters;
        // If length changed or it's empty, sync it completely.
        if (prev.length === 0 || prev.length !== newOutlineSections.length) {
          return newOutlineSections;
        }
        return prev;
      });
    }
  }, [outline]);

  const addLog = (text: string) => {
    setLogs((prev) => [...prev, { id: Math.random().toString(), text, time: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayedText, logs, streamStatus]);

  const hasRunRef = useRef(false);

  useEffect(() => {
    if (typingBufferRef.current.length > displayedText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(typingBufferRef.current.slice(0, displayedText.length + 3)); // Type 3 chars at a time
      }, 10);
      return () => clearTimeout(timeout);
    }
  }, [displayedText, typingBuffer]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    if (!isInitialized) return;
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    
    let eventSource: EventSource | null = null;
    let localFinalSections: any = outline?.sections || outline?.chapters || [];

    async function runStreamAndAssemble() {

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
            reportCategory,
            totalPages,
            font,
            color,
            customChapterCount,
            additionalInstructions,
            customGeminiKey
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
                  
                  // Append to typing buffer for the live typewriter effect
                  if (event.content) {
                    const snippet = `\n\n### ${event.title}\n${event.content}`;
                    typingBufferRef.current += snippet;
                    setTypingBuffer(typingBufferRef.current);
                  }
                  
                  setLiveSections(prev => {
                    const newSections = [...prev];
                    if (event.index >= 0 && event.index < newSections.length) {
                      newSections[event.index] = { ...newSections[event.index], content: event.content };
                    }
                    return newSections;
                  });
                } else if (event.type === "complete") {
                  if (event.sections && event.sections.length > 0) {
                    localFinalSections = event.sections;
                    setFinalSections(event.sections);
                  }
                }
              } catch (err) {}
            }
          }
        }

        setIsStreaming(false);
        setIsAssembling(false);
        addLog("Stream complete. Ready for manual download.");
      } catch (err: any) {
        setError(err.message || "Generation error.");
        setIsStreaming(false);
        setIsAssembling(false);
      }
    }

    runStreamAndAssemble();
  }, [prompt, format, docType, outline, researchBundle, setFinalSections, router, isInitialized, font, totalPages, color, reportCategory, customChapterCount, additionalInstructions, customGeminiKey]);

  const handleDownload = async () => {
    try {
      setIsAssembling(true);
      const currentSections = finalSections && finalSections.length > 0 ? finalSections : liveSections;
      const resAssemble = await fetch("/api/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: downloadFormat,
          title: outline.title || prompt,
          subtitle: outline.subtitle || "",
          docType: outline.docType || docType,
          sections: currentSections,
          selectedFont: font,
          accentColor: color,
          academicMeta: { reportCategory }
        }),
      });

      if (!resAssemble.ok) throw new Error(`Assembly failed for ${downloadFormat}`);

      const blob = await resAssemble.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(outline.title || prompt).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${downloadFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsAssembling(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Download error.");
      setIsAssembling(false);
    }
  };

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
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: '16px', padding: '24px', position: 'relative' }}>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={18} className={isStreaming ? "animate-spin text-primary" : ""} style={{ color: isStreaming ? 'var(--brand-accent)' : 'var(--text-secondary)' }} /> 
            Live Generation Stream
          </h2>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0d1117', border: '1px solid #30363d', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
          {/* macOS Window Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f' }} />
            <div style={{ marginLeft: '12px', fontSize: '0.85rem', color: '#8b949e', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} /> build.log
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '24px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {logs.map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: '16px', color: '#c9d1d9', lineHeight: '1.5' }}>
                <span style={{ color: '#8b949e', whiteSpace: 'nowrap', userSelect: 'none' }}>[{log.time}]</span>
                <span style={{ color: log.text.includes("Error") ? '#ff7b72' : log.text.includes("Complete") || log.text.includes("Drafted") ? '#7ee787' : '#c9d1d9' }}>{log.text}</span>
              </div>
            ))}
            
            {/* Live Typing Effect */}
            {displayedText && (
              <div style={{ marginTop: '16px', color: '#a5d6ff', whiteSpace: 'pre-wrap', borderLeft: '2px solid #30363d', paddingLeft: '12px' }}>
                {displayedText}
              </div>
            )}
            {isStreaming && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--brand-accent)', marginTop: '8px' }}>
                <Loader2 size={14} className="animate-spin" />
                <span>{streamStatus}</span>
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
          </div>
        </div>

        {/* Right Column: Preview & Output */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: '16px', padding: '24px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} /> Document Assembly
            </h2>
            {!isStreaming && isAssembling && (
              <div style={{ margin: 0, padding: '8px 16px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Loader2 size={16} className="animate-spin" /> Packaging {downloadFormat.toUpperCase()}...
              </div>
            )}
            {!isStreaming && !isAssembling && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select 
                  value={downloadFormat} 
                  onChange={(e) => setDownloadFormat(e.target.value as "docx" | "pdf")}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="pdf">PDF Document</option>
                  <option value="docx">Word Document</option>
                </select>
                <button 
                  onClick={handleDownload} 
                  style={{ 
                    margin: 0, 
                    padding: '8px 16px', 
                    fontSize: '0.9rem', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    border: 'none', 
                    cursor: 'pointer',
                    backgroundColor: 'var(--brand-accent)',
                    color: 'white',
                    borderRadius: '8px'
                  }}
                >
                  <FileDown size={16} /> Download
                </button>
              </div>
            )}
          </div>
          
          <div style={{ 
            flex: 1, 
            backgroundColor: 'var(--bg-secondary)', 
            borderRadius: '8px', 
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden'
          }}>
            
            {error && (
              <div style={{ color: 'red', zIndex: 10 }}>
                <p>Failed to generate document: {error}</p>
                <button onClick={() => router.push("/")} className={styles.submitBtn} style={{ marginTop: '16px' }}>Start Over</button>
              </div>
            )}

            {!error && (
              <>
                <div style={{ flex: 1, width: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <LivePreview sections={getSyncedSections()} />
                </div>
              </>
            )}

          </div>
        </div>

      </main>
    </div>
  );
}
