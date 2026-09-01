"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDocumentContext } from "@/lib/DocumentContext";
import { ArrowUp, Clock, Settings2, User } from "lucide-react";
import styles from "./page.module.css";
import { Logo } from "@/components/ui/Logo";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { cn } from "@/lib/utils";

type FormatType = "academic" | "ieee" | "slide";

export default function Home() {
  const { 
    setPrompt: setContextPrompt, 
    setFormat: setContextFormat, 
    setDocType,
    font, setFont,
    totalPages, setTotalPages,
    color, setColor,
    audienceContext, setAudienceContext
  } = useDocumentContext();
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<FormatType>("academic");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [useFrontMatter, setUseFrontMatter] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setContextPrompt(prompt);
    setContextFormat(format === "slide" ? "pptx" : "docx");
    setDocType(format === "slide" ? "Pitch Deck" : format === "ieee" ? "IEEE Paper" : "Research Report");
    router.push("/build");
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  return (
    <div className={styles.container}>
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
        )}
      />
      <header className={styles.header}>
        <Logo size="md" />
        
        <div className={styles.headerRight}>
          <button className={styles.headerPill}>
            <Clock size={16} /> History
          </button>
          <div className={styles.headerPill}>
            Model: <span className="font-semibold text-primary">Gemini 3.1 Pro</span>
          </div>
          <button className={styles.headerPill}>
            <User size={16} /> Sign In
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.promptArea}>
          <p className={styles.promptCopy}>
            <TypingAnimation 
              text="Describe the thesis, methodology, or key arguments for your document." 
              duration={40} 
              className="text-inherit font-normal text-lg"
            />
          </p>
          
          <div className={`${styles.promptBar} glass-panel`}>
            <textarea 
              ref={textareaRef}
              className={styles.promptInput}
              placeholder="E.g., An empirical analysis of glassmorphism in modern web interfaces, focusing on cognitive load..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={1}
            />
            <button 
              className={styles.submitBtn} 
              disabled={!prompt.trim()}
              onClick={handleGenerate}
              aria-label="Generate Document"
              style={{ opacity: prompt.trim() ? 1 : 0.5 }}
            >
              <ArrowUp size={20} />
            </button>
          </div>


          <div className={`${styles.formatControl} glass-panel`}>
            <button 
              className={`${styles.formatPill} ${format === "academic" ? styles.active : ""}`}
              onClick={() => setFormat("academic")}
            >
              Academic Report
            </button>
            <button 
              className={`${styles.formatPill} ${format === "ieee" ? styles.active : ""}`}
              onClick={() => setFormat("ieee")}
            >
              IEEE Research Paper
            </button>
            <button 
              className={`${styles.formatPill} ${format === "slide" ? styles.active : ""}`}
              onClick={() => setFormat("slide")}
            >
              Slide Deck
            </button>
          </div>

          <div className={styles.settingsWrapper}>
            {!isSettingsOpen ? (
              <button 
                className={styles.settingsSummary} 
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings2 size={16} />
                <span>Approx. 3,500 words &middot; 12 pages &middot; 5 chapters</span>
              </button>
            ) : (
              <div className={`${styles.settingsPanel} glass-panel`}>
                <div className={styles.settingsRow}>
                  <div className={styles.settingsField}>
                    <span className={styles.fieldLabel}>Typography</span>
                    <select className="form-input" value={font} onChange={e => setFont(e.target.value)}>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Merriweather">Merriweather</option>
                      <option value="Georgia">Georgia</option>
                    </select>
                  </div>
                  <div className={styles.settingsField}>
                    <span className={styles.fieldLabel}>Total Pages</span>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={totalPages} 
                      onChange={e => setTotalPages(Number(e.target.value))} 
                      min={1} 
                      max={100} 
                    />
                  </div>
                  <div className={styles.settingsField}>
                    <span className={styles.fieldLabel}>Color</span>
                    <select className="form-input" value={color} onChange={e => setColor(e.target.value)}>
                      <option value="Black">Black</option>
                      <option value="Midnight Executive">Midnight Executive</option>
                      <option value="Sepia">Sepia</option>
                    </select>
                  </div>
                </div>

                <div className={styles.settingsRow} style={{ marginTop: 12 }}>
                  <div className={styles.settingsField} style={{ flex: 1 }}>
                    <span className={styles.fieldLabel}>Target Audience / Context</span>
                    <select className="form-input" value={audienceContext} onChange={e => setAudienceContext(e.target.value)}>
                      <option value="School">School</option>
                      <option value="College">College</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Corporate">Corporate</option>
                    </select>
                  </div>
                </div>

                <div className={styles.settingsRow} style={{ marginTop: 12 }}>
                  <div className={styles.settingsField} style={{ flex: 1 }}>
                    <span className={styles.fieldLabel}>Additional Structural Instructions</span>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g., Include a dedicated Methodology chapter before Results" 
                    />
                  </div>
                </div>

                <div className={styles.settingsRow} style={{ marginTop: 8 }}>
                  <div 
                    className={styles.toggleWrapper}
                    onClick={() => setUseFrontMatter(!useFrontMatter)}
                  >
                    <div className={`${styles.toggleTrack} ${useFrontMatter ? styles.active : ""}`}>
                      <div className={styles.toggleThumb} />
                    </div>
                    <span className={styles.toggleLabel}>Include Formal Academic Front Matter</span>
                  </div>
                </div>

                {useFrontMatter && (
                  <div className={styles.frontMatter}>
                    <div className={styles.settingsRow}>
                      <div className={styles.settingsField} style={{ flex: 1 }}>
                        <span className={styles.fieldLabel}>Institution</span>
                        <input type="text" className="form-input" placeholder="University or Organization Name" />
                      </div>
                      <div className={styles.settingsField} style={{ flex: 1 }}>
                        <span className={styles.fieldLabel}>Department</span>
                        <input type="text" className="form-input" placeholder="School of Computer Science" />
                      </div>
                    </div>
                    <div className={styles.settingsRow}>
                      <div className={styles.settingsField} style={{ flex: 1 }}>
                        <span className={styles.fieldLabel}>Submitted By</span>
                        <input type="text" className="form-input" placeholder="Author Names" />
                      </div>
                      <div className={styles.settingsField} style={{ flex: 1 }}>
                        <span className={styles.fieldLabel}>Guided By</span>
                        <input type="text" className="form-input" placeholder="Advisor or Professor" />
                      </div>
                    </div>
                  </div>
                )}
                
                <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                  <button 
                    className={styles.settingsSummary} 
                    onClick={() => setIsSettingsOpen(false)}
                  >
                    <ArrowUp size={16} /> Collapse Settings
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
