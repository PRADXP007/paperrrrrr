"use client";

import { useState, useEffect, useRef } from "react";

interface ResearchSource {
  index: number;
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

interface OutlineSection {
  id: string;
  title: string;
  brief: string;
  keyPoints: string[];
  relevantSourceIndices: number[];
  content?: string;
  status?: "pending" | "generating" | "completed";
}

interface GeneratedOutline {
  title: string;
  subtitle: string;
  docType: string;
  format: "docx" | "pptx" | "xlsx" | "pdf";
  targetLength: string;
  sections: OutlineSection[];
}

export default function PaperrrrrrApp() {
  // Navigation & Pipeline state: 'intake' | 'generating_outline' | 'outline' | 'workspace' | 'preview'
  const [step, setStep] = useState<"intake" | "generating_outline" | "outline" | "workspace" | "preview">("intake");

  // User state & Mongo persistence
  const [user, setUser] = useState<{ id?: string; name?: string; email?: string; avatar?: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [pastDocuments, setPastDocuments] = useState<any[]>([]);

  // BYOK Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customGeminiKeyInput, setCustomGeminiKeyInput] = useState("");
  const [customOpenAIKeyInput, setCustomOpenAIKeyInput] = useState("");
  const [hasCustomGeminiKey, setHasCustomGeminiKey] = useState(false);
  const [geminiKeyMasked, setGeminiKeyMasked] = useState("");
  const [hasCustomOpenAIKey, setHasCustomOpenAIKey] = useState(false);
  const [openaiKeyMasked, setOpenaiKeyMasked] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Form intake state (Homepage Centerpiece)
  const [prompt, setPrompt] = useState("a report on renewable energy adoption in India");
  const [format, setFormat] = useState<"docx" | "pptx" | "xlsx" | "pdf">("docx");
  const [docType, setDocType] = useState("Research Report");
  const [tone, setTone] = useState("Academic & Analytical");
  const [audience, setAudience] = useState("Students & Researchers");
  const [targetLength, setTargetLength] = useState("Detailed (~2,000 words)");

  // Follow-up instruction state for split-screen pinned prompt bar
  const [followUpInstruction, setFollowUpInstruction] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState<string[]>([]);

  // Pipeline runtime state
  const [docId, setDocId] = useState<string | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchBundle, setResearchBundle] = useState<{ query: string; results: ResearchSource[]; answer?: string } | null>(null);

  // Outline state
  const [outline, setOutline] = useState<GeneratedOutline | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  // Live SSE Generation & Split-Screen Workspace State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatusText, setStreamStatusText] = useState("Initializing stream pipeline...");
  const [activeGeneratingSectionIndex, setActiveGeneratingSectionIndex] = useState<number | null>(null);
  const [generatedSections, setGeneratedSections] = useState<Record<string, string>>({});
  const [streamTimelineEvents, setStreamTimelineEvents] = useState<
    Array<{ id: string; timestamp: string; type: "status" | "research" | "outline" | "section" | "complete" | "error"; title: string; detail?: string }>
  >([]);
  const [isAssembledReady, setIsAssembledReady] = useState(false);
  const [assembledBlobUrl, setAssembledBlobUrl] = useState<string | null>(null);
  const [assembledFilename, setAssembledFilename] = useState<string>("");

  const timelineEndRef = useRef<HTMLDivElement | null>(null);

  // Load document history & key settings on mount/user change
  useEffect(() => {
    fetchPastDocuments();
    fetchUserKeySettings();
  }, [user]);

  // Auto-scroll timeline feed as new SSE events arrive
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamTimelineEvents]);

  const fetchPastDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        if (data.documents) setPastDocuments(data.documents);
      }
    } catch (e) {
      console.warn("Failed to fetch history:", e);
    }
  };

  const fetchUserKeySettings = async () => {
    try {
      const res = await fetch("/api/user/keys");
      if (res.ok) {
        const data = await res.json();
        setHasCustomGeminiKey(Boolean(data.hasGeminiKey));
        setGeminiKeyMasked(data.geminiMasked || "");
        setHasCustomOpenAIKey(Boolean(data.hasOpenaiKey));
        setOpenaiKeyMasked(data.openaiMasked || "");
      }
    } catch (e) {
      console.warn("Failed to fetch user keys:", e);
    }
  };

  const handleSaveKeys = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/user/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiKey: customGeminiKeyInput,
          openaiKey: customOpenAIKeyInput
        })
      });
      if (res.ok) {
        await fetchUserKeySettings();
        setShowSettingsModal(false);
        setCustomGeminiKeyInput("");
        setCustomOpenAIKeyInput("");
      } else {
        const data = await res.json();
        alert("Failed to save key: " + (data.error || "Unknown"));
      }
    } catch (err: any) {
      alert("Error saving keys: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleClearKeys = async () => {
    if (!confirm("Are you sure you want to remove your custom API keys?")) return;
    try {
      await fetch("/api/user/keys", { method: "DELETE" });
      setHasCustomGeminiKey(false);
      setGeminiKeyMasked("");
      setHasCustomOpenAIKey(false);
      setOpenaiKeyMasked("");
      setShowSettingsModal(false);
    } catch (err: any) {
      alert("Error clearing keys: " + err.message);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: authMode,
          email: authEmail,
          password: authPassword,
          name: authName
        })
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setShowAuthModal(false);
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");
      } else {
        alert(data.error || "Authentication failed");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const googleEmail = typeof window !== "undefined" ? window.prompt("Enter your Google Account email for Instant Sign-In:", "user@gmail.com") : null;
      if (!googleEmail) return;

      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail,
          name: googleEmail.split("@")[0],
          googleId: `goog_${Date.now()}`
        })
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setShowAuthModal(false);
      } else {
        alert(data.error || "Google Sign-In failed");
      }
    } catch (err: any) {
      alert("Google Sign-In error: " + err.message);
    }
  };

  // Step 1 -> Step 2: Run Tavily research & generate outline via Gemini 2.5 Flash
  const handleStartPipeline = async () => {
    if (!prompt.trim()) return;

    setIsResearching(true);
    setStep("generating_outline");
    setStreamStatusText("Synthesizing live web research via Tavily...");

    const initialEvent = {
      id: `ev_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: "status" as const,
      title: "Live Web Research Started",
      detail: `Searching live web benchmarks for: "${prompt}"`
    };
    setStreamTimelineEvents([initialEvent]);

    try {
      // 1. Tavily Research
      const resResearch = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, format, tone, audience, targetLength })
      });
      const dataResearch = await resResearch.json();

      if (!dataResearch.success) {
        throw new Error(dataResearch.error || "Research step failed");
      }

      setResearchBundle(dataResearch.researchBundle);
      if (dataResearch.docId) setDocId(dataResearch.docId);

      setStreamTimelineEvents((prev) => [
        ...prev,
        {
          id: `ev_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "research",
          title: `Retrieved ${dataResearch.researchBundle.results.length} live research sources`,
          detail: dataResearch.researchBundle.results.map((r: any) => r.title).join(" • ")
        }
      ]);

      // 2. Structured JSON Outline with Gemini 2.5 Flash
      setStreamStatusText("Structuring JSON outline with Gemini 2.5 Flash...");
      setIsGeneratingOutline(true);

      const resOutline = await fetch("/api/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: dataResearch.docId,
          prompt,
          options: {
            format,
            tone,
            audience,
            targetLength,
            docType,
            customGeminiKey: hasCustomGeminiKey ? customGeminiKeyInput : undefined
          },
          researchBundle: dataResearch.researchBundle
        })
      });
      const dataOutline = await resOutline.json();

      if (!dataOutline.success) {
        throw new Error(dataOutline.error || "Outline generation failed");
      }

      setOutline(dataOutline.outline);
      setIsResearching(false);
      setIsGeneratingOutline(false);

      setStreamTimelineEvents((prev) => [
        ...prev,
        {
          id: `ev_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "outline",
          title: `Outline Framed (${dataOutline.outline.sections.length} Sections)`,
          detail: `Title: "${dataOutline.outline.title}"`
        }
      ]);

      // Transition smoothly to Outline Reviewer Screen
      setStep("outline");
    } catch (err: any) {
      alert("Pipeline Error: " + err.message);
      setIsResearching(false);
      setIsGeneratingOutline(false);
      setStep("intake");
    }
  };

  // Outline Editing Helpers
  const handleSectionTitleChange = (idx: number, newTitle: string) => {
    if (!outline) return;
    const updated = { ...outline };
    updated.sections[idx].title = newTitle;
    setOutline(updated);
  };

  const handleSectionBriefChange = (idx: number, newBrief: string) => {
    if (!outline) return;
    const updated = { ...outline };
    updated.sections[idx].brief = newBrief;
    setOutline(updated);
  };

  const handleAddSection = () => {
    if (!outline) return;
    const updated = { ...outline };
    const newId = `sec_${updated.sections.length + 1}`;
    updated.sections.push({
      id: newId,
      title: `New Section ${updated.sections.length + 1}`,
      brief: "Additional analytical perspectives and supporting synthesis.",
      keyPoints: ["Supporting arguments", "Data synthesis"],
      relevantSourceIndices: [1]
    });
    setOutline(updated);
  };

  const handleDeleteSection = (idx: number) => {
    if (!outline || outline.sections.length <= 1) return;
    const updated = { ...outline };
    updated.sections.splice(idx, 1);
    setOutline(updated);
  };

  // Step 2 -> Step 3: Approve Outline -> Launch Split-Screen SSE Live Generation Stream
  const handleApproveAndLaunchLiveWorkspace = async () => {
    if (!outline) return;

    setStep("workspace");
    setIsStreaming(true);
    setIsAssembledReady(false);
    setGeneratedSections({});
    setStreamStatusText("Connecting to live Server-Sent Events generation stream...");

    setStreamTimelineEvents((prev) => [
      ...prev,
      {
        id: `ev_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "status",
        title: "Outline Approved — Live SSE Stream Connected",
        detail: `Beginning real-time section prose drafting with Gemini 2.5 Flash.`
      }
    ]);

    try {
      const response = await fetch("/api/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: outline.title,
          format,
          tone,
          audience,
          targetLength,
          docType,
          docId,
          approvedOutline: outline,
          researchBundle,
          customGeminiKey: hasCustomGeminiKey ? customGeminiKeyInput : undefined
        })
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to SSE stream endpoint");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace(/^data: /, "").trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "status") {
                setStreamStatusText(event.message || "Generating...");
                if (event.step === "section_start") {
                  setActiveGeneratingSectionIndex(event.index);
                  setStreamTimelineEvents((prev) => [
                    ...prev,
                    {
                      id: `ev_${Date.now()}_${event.index}`,
                      timestamp: new Date().toLocaleTimeString(),
                      type: "status",
                      title: `Drafting Section ${event.index + 1} of ${event.total}`,
                      detail: event.title
                    }
                  ]);
                }
              } else if (event.type === "section_done") {
                const normId = event.id || `sec_${event.index + 1}`;
                setGeneratedSections((prev) => ({
                  ...prev,
                  [normId]: event.content,
                  [event.index]: event.content,
                  [`sec_${event.index + 1}`]: event.content,
                  [event.title]: event.content
                }));
                setStreamTimelineEvents((prev) => [
                  ...prev,
                  {
                    id: `ev_done_${event.id || event.index}_${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString(),
                    type: "section",
                    title: `Section ${event.index + 1} Completed`,
                    detail: `"${event.title}" (${event.content.length} characters with citations)`
                  }
                ]);
              } else if (event.type === "complete") {
                setIsStreaming(false);
                setActiveGeneratingSectionIndex(null);
                setStreamStatusText("All sections drafted! Assembling binary download package...");

                // Execute final assemble call to get downloadable Blob
                const compiledSections = event.sections || outline.sections.map((s) => ({
                  title: s.title,
                  brief: s.brief,
                  content: generatedSections[s.id] || s.brief
                }));

                const resAssemble = await fetch("/api/assemble", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    docId,
                    title: outline.title,
                    subtitle: outline.subtitle,
                    format,
                    sections: compiledSections
                  })
                });

                if (resAssemble.ok) {
                  const blob = await resAssemble.blob();
                  const downloadUrl = URL.createObjectURL(blob);
                  const filename = `Paperrrrrr_${outline.title.replace(/[^a-zA-Z0-9_\-]/g, "_")}.${format}`;

                  setAssembledBlobUrl(downloadUrl);
                  setAssembledFilename(filename);
                  setIsAssembledReady(true);
                  setStreamStatusText("Document ready for 1-click download!");

                  setStreamTimelineEvents((prev) => [
                    ...prev,
                    {
                      id: `ev_complete_${Date.now()}`,
                      timestamp: new Date().toLocaleTimeString(),
                      type: "complete",
                      title: `Document Assembly Completed`,
                      detail: `Downloadable ${format.toUpperCase()} package created.`
                    }
                  ]);

                  fetchPastDocuments();
                }
              } else if (event.type === "error") {
                console.error("SSE Stream Error Event:", event.error);
                setStreamTimelineEvents((prev) => [
                  ...prev,
                  {
                    id: `ev_err_${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString(),
                    type: "error",
                    title: "Generation Warning",
                    detail: event.error
                  }
                ]);
              }
            } catch (jsonErr) {
              console.warn("Failed to parse SSE JSON payload:", jsonErr);
            }
          }
        }
      }
    } catch (streamErr: any) {
      console.error("Stream reader error:", streamErr);
      setIsStreaming(false);
      setStreamStatusText("Stream finished.");
    }
  };

  const handleAddFollowUpNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpInstruction.trim()) return;
    setFollowUpNotes((prev) => [...prev, followUpInstruction.trim()]);
    setStreamTimelineEvents((prev) => [
      ...prev,
      {
        id: `ev_follow_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "status",
        title: "User Refinement Added",
        detail: `Instruction: "${followUpInstruction.trim()}"`
      }
    ]);
    setFollowUpInstruction("");
  };

  const handleDownloadFile = () => {
    if (!assembledBlobUrl) return;
    const a = document.createElement("a");
    a.href = assembledBlobUrl;
    a.download = assembledFilename || `Paperrrrrr_Document.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1B1C1A] flex flex-col font-sans">
      {/* ============================================================ */}
      {/* TOP HEADER: BRANDING, BYOK BADGE, AUTH                       */}
      {/* ============================================================ */}
      <header className="sticky top-0 bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#DBC1BA] z-40">
        <div className="flex justify-between items-center px-4 sm:px-8 py-3.5 max-w-7xl mx-auto w-full">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStep("intake")}>
            <span className="material-symbols-outlined text-[#97422C] text-3xl font-bold">draft</span>
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-black tracking-tight text-[#97422C]">Paperrrrrr</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#88726D] -mt-1">
                Gemini 2.5 Flash Studio
              </span>
            </div>
          </div>

          {/* Center / Right Header Navigation & BYOK Status */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* BYOK Status Indicator Badge */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                hasCustomGeminiKey
                  ? "bg-[#FFDBD2] text-[#97422C] border-[#97422C]"
                  : "bg-white text-[#55423E] border-[#DBC1BA] hover:border-[#97422C]"
              }`}
            >
              <span className="material-symbols-outlined text-sm">{hasCustomGeminiKey ? "key" : "tune"}</span>
              <span className="hidden sm:inline">
                {hasCustomGeminiKey ? `Custom Key (${geminiKeyMasked})` : "App Default AI"}
              </span>
              <span className="sm:hidden">{hasCustomGeminiKey ? "Key" : "AI"}</span>
            </button>

            {/* Auth Button / Profile */}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1B1C1A] bg-[#FAF9F5] border border-[#DBC1BA] px-2.5 py-1 rounded">
                  👤 {user.name}
                </span>
                <button
                  onClick={() => setUser(null)}
                  className="text-xs text-[#88726D] hover:text-[#97422C] underline ml-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-xs font-bold uppercase tracking-wider text-[#97422C] border border-[#97422C] px-3.5 py-1.5 rounded hover:bg-[#97422C] hover:text-white transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main App Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-start">
        {/* ============================================================ */}
        {/* SCREEN 1: HOMEPAGE CENTERPIECE PASS (INTAKE UI)              */}
        {/* ============================================================ */}
        {step === "intake" && (
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-8 py-4 sm:py-8">
            {/* Header Text - Prominently Centered near the top */}
            <div className="flex flex-col gap-2 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#97422C] bg-[#FFDBD2] px-3 py-1 rounded-full w-max mx-auto">
                ⚡ Powered by Gemini 2.5 Flash & Tavily Web Search
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#1B1C1A] font-bold leading-tight mt-2">
                Tell us what you're working on.
              </h1>
              <p className="text-base sm:text-lg text-[#55423E] max-w-xl mx-auto">
                Enter a topic, research question, or thesis to generate a fully sourced, editable Word, PPT, Excel, or PDF document.
              </p>
            </div>

            {/* Target Output Format Pills */}
            <div className="flex flex-wrap justify-center gap-2 items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#55423E] mr-1">Target Output:</span>
              {[
                { key: "docx", label: "📄 Word (.docx)" },
                { key: "pptx", label: "📊 PowerPoint (.pptx)" },
                { key: "xlsx", label: "📈 Excel (.xlsx)" },
                { key: "pdf", label: "📕 PDF (.pdf)" }
              ].map((fmt) => (
                <button
                  key={fmt.key}
                  type="button"
                  onClick={() => setFormat(fmt.key as any)}
                  className={`text-xs font-semibold px-4 py-2 rounded-full transition-all border ${
                    format === fmt.key
                      ? "bg-[#97422C] text-white border-[#97422C] shadow-sm"
                      : "bg-white text-[#1B1C1A] border-[#DBC1BA] hover:border-[#97422C]"
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            {/* Prominent Prompt Textarea Centerpiece */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="e.g., A comprehensive analysis of renewable energy adoption in India, or a pitch deck on AI document pipelines..."
                  className="w-full p-5 bg-white border-2 border-[#DBC1BA] rounded-xl focus:border-[#97422C] focus:ring-2 focus:ring-[#FFDBD2] outline-none text-[#1B1C1A] text-lg leading-relaxed paper-shadow"
                />
                <div className="absolute right-4 bottom-4 text-xs text-[#88726D]">
                  {prompt.length} characters
                </div>
              </div>
            </div>

            {/* Document Type Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { type: "Research Report", icon: "description", desc: "In-depth analysis with structured web citations & findings." },
                { type: "Academic Essay", icon: "edit_document", desc: "Argumentative prose with clear thesis & section briefs." },
                { type: "Literature Review", icon: "history_edu", desc: "Synthesize research & current academic conversations." },
                { type: "Freeform Summary", icon: "article", desc: "Unconstrained synthesis across multiple research topics." }
              ].map((card) => (
                <button
                  key={card.type}
                  onClick={() => setDocType(card.type)}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all ${
                    docType === card.type
                      ? "bg-[#FAF9F5] border-[#97422C] ring-2 ring-[#97422C] shadow-sm"
                      : "bg-white border-[#DBC1BA] hover:border-[#97422C]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FFDBD2] text-[#97422C] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">{card.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-serif text-base text-[#1B1C1A] font-bold">{card.type}</h3>
                    <p className="text-xs text-[#55423E] mt-0.5">{card.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Tone, Audience, Length Customization Controls */}
            <div className="p-4 bg-white border border-[#DBC1BA] rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-[#55423E] block mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full p-2.5 border border-[#DBC1BA] rounded-lg bg-[#FAF9F5] outline-none"
                >
                  <option>Academic & Analytical</option>
                  <option>Business Professional</option>
                  <option>Technical Deep-Dive</option>
                  <option>Persuasive Argument</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#55423E] block mb-1">Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full p-2.5 border border-[#DBC1BA] rounded-lg bg-[#FAF9F5] outline-none"
                >
                  <option>Students & Researchers</option>
                  <option>Executive Management</option>
                  <option>General Public</option>
                  <option>Technical Engineers</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#55423E] block mb-1">Length</label>
                <select
                  value={targetLength}
                  onChange={(e) => setTargetLength(e.target.value)}
                  className="w-full p-2.5 border border-[#DBC1BA] rounded-lg bg-[#FAF9F5] outline-none"
                >
                  <option>Detailed (~2,000 words)</option>
                  <option>Standard (~1,200 words)</option>
                  <option>Concise (~800 words)</option>
                </select>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleStartPipeline}
              disabled={isResearching || isGeneratingOutline}
              className="w-full py-4.5 bg-[#97422C] text-white font-bold text-base rounded-xl hover:bg-[#B65A42] transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined">search</span>
              Run Research & Generate Outline with Gemini →
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 1.5: DEDICATED RESEARCH & OUTLINE GENERATION LOADER   */}
        {/* ============================================================ */}
        {step === "generating_outline" && (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center gap-8 py-16 text-center">
            {/* Animated Beacon */}
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-[#FFDBD2] animate-ping opacity-75" />
              <div className="absolute w-20 h-20 rounded-full bg-[#97422C] flex items-center justify-center text-white text-3xl shadow-xl">
                <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
              </div>
            </div>

            {/* Dynamic Status Text */}
            <div className="flex flex-col gap-2 max-w-md">
              <span className="text-xs font-bold uppercase tracking-widest text-[#97422C] bg-[#FFDBD2] px-3 py-1 rounded-full w-max mx-auto">
                ⚡ Active Synthesis Pipeline
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#1B1C1A] font-bold">
                {streamStatusText}
              </h2>
              <p className="text-sm text-[#55423E]">
                Analyzing verified web sources and framing structured sections with Gemini 2.5 Flash.
              </p>
            </div>

            {/* Progress Bar & Timeline Feed Preview */}
            <div className="w-full bg-white border border-[#DBC1BA] p-6 rounded-2xl paper-shadow flex flex-col gap-4 text-left">
              <div className="flex justify-between items-center text-xs font-mono text-[#88726D]">
                <span>Pipeline Status</span>
                <span className="text-[#97422C] font-bold">Live Research Active</span>
              </div>
              <div className="w-full h-2.5 bg-[#FAF9F5] border border-[#DBC1BA] rounded-full overflow-hidden">
                <div className="h-full bg-[#97422C] rounded-full animate-pulse w-3/4" />
              </div>

              {/* Mini Activity Feed during synthesis */}
              <div className="space-y-2 pt-2 border-t border-[#EFEEEA] text-xs">
                {streamTimelineEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2 text-[#55423E]">
                    <span className="text-[#97422C] font-bold">✓</span>
                    <span className="font-medium text-[#1B1C1A]">{ev.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 2: OUTLINE REVIEW & EDIT (STEP 2)                     */}
        {/* ============================================================ */}
        {step === "outline" && outline && (
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 py-4">
            <div className="border-b border-[#DBC1BA] pb-4 flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#97422C]">Step 2 of 3</span>
                <h1 className="font-serif text-3xl text-[#97422C] font-bold mt-1">Review & Approve Outline</h1>
                <p className="text-sm text-[#55423E]">
                  Edit titles, briefs, or reorder sections before opening the live split-screen workspace.
                </p>
              </div>
              <span className="px-3 py-1 bg-[#FFDBD2] text-[#97422C] text-xs font-bold rounded-full">
                {outline.sections.length} Sections
              </span>
            </div>

            {/* Document Title Header Input */}
            <div className="p-4 bg-white border border-[#DBC1BA] rounded-xl flex flex-col gap-2">
              <label className="text-xs font-bold text-[#88726D] uppercase tracking-wider">Document Title</label>
              <input
                type="text"
                value={outline.title}
                onChange={(e) => setOutline({ ...outline, title: e.target.value })}
                className="font-serif text-xl font-bold text-[#1B1C1A] p-2.5 border border-[#DBC1BA] rounded-lg focus:border-[#97422C] outline-none"
              />
              <input
                type="text"
                value={outline.subtitle}
                onChange={(e) => setOutline({ ...outline, subtitle: e.target.value })}
                className="text-xs text-[#55423E] italic p-2 border border-[#DBC1BA] rounded-lg"
                placeholder="Subtitle..."
              />
            </div>

            {/* Editable Sections List */}
            <div className="flex flex-col gap-4">
              {outline.sections.map((sec, idx) => (
                <div key={sec.id || idx} className="p-5 bg-white border border-[#DBC1BA] rounded-xl paper-shadow flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#97422C] bg-[#FAF9F5] px-2.5 py-1 rounded border border-[#DBC1BA]">
                      Section #{idx + 1}
                    </span>
                    <button
                      onClick={() => handleDeleteSection(idx)}
                      className="text-xs text-[#BA1A1A] hover:underline cursor-pointer"
                    >
                      Remove Section
                    </button>
                  </div>

                  <div>
                    <label className="text-xs text-[#88726D] font-semibold">Section Title</label>
                    <input
                      type="text"
                      value={sec.title}
                      onChange={(e) => handleSectionTitleChange(idx, e.target.value)}
                      className="w-full font-serif text-base font-bold text-[#1B1C1A] p-2 border border-[#DBC1BA] rounded-lg mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#88726D] font-semibold">One-Line Brief</label>
                    <input
                      type="text"
                      value={sec.brief}
                      onChange={(e) => handleSectionBriefChange(idx, e.target.value)}
                      className="w-full text-xs text-[#55423E] p-2 border border-[#DBC1BA] rounded-lg mt-1"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-[#EFEEEA]">
                    <span className="text-xs text-[#88726D]">Sources Attached:</span>
                    {(sec.relevantSourceIndices || [1]).map((srcIdx: number) => (
                      <span key={srcIdx} className="text-xs bg-[#E9E8E4] text-[#1B1C1A] px-2 py-0.5 rounded font-mono">
                        Source #{srcIdx}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddSection}
                className="py-3.5 border-2 border-dashed border-[#DBC1BA] text-[#97422C] text-sm font-bold rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                + Add Section
              </button>
            </div>

            {/* Approval CTAs */}
            <div className="flex gap-4 pt-4 border-t border-[#DBC1BA]">
              <button
                onClick={() => setStep("intake")}
                className="px-6 py-3.5 border border-[#88726D] text-[#1B1C1A] text-sm font-bold rounded-xl hover:bg-[#EFEEEA] cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={handleApproveAndLaunchLiveWorkspace}
                className="flex-1 py-3.5 bg-[#97422C] text-white font-bold text-sm rounded-xl hover:bg-[#B65A42] transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                Approve Outline & Open Live Split-Screen Workspace →
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 3: SPLIT-SCREEN WORKSPACE (40% FEED / 60% PREVIEW)    */}
        {/* ============================================================ */}
        {step === "workspace" && outline && (
          <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto py-2">
            {/* -------------------------------------------------------- */}
            {/* LEFT COLUMN: 40% WIDTH - PINNED PROMPT BAR & SSE FEED   */}
            {/* -------------------------------------------------------- */}
            <div className="w-full lg:w-[40%] flex flex-col gap-4 shrink-0">
              {/* Pinned Top Prompt Bar */}
              <div className="bg-white border border-[#DBC1BA] rounded-xl p-4 paper-shadow flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#97422C] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">tune</span>
                    Follow-Up Instructions
                  </span>
                  <span className="text-[10px] text-[#88726D] font-mono">Pinned</span>
                </div>
                <form onSubmit={handleAddFollowUpNote} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add follow-up instructions or specific points..."
                    value={followUpInstruction}
                    onChange={(e) => setFollowUpInstruction(e.target.value)}
                    className="flex-1 text-xs p-2.5 border border-[#DBC1BA] rounded-lg outline-none focus:border-[#97422C]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-[#97422C] text-white text-xs font-bold rounded-lg hover:bg-[#B65A42] transition-colors shrink-0"
                  >
                    Add
                  </button>
                </form>
                {followUpNotes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {followUpNotes.map((n, i) => (
                      <span key={i} className="text-[11px] bg-[#FAF9F5] border border-[#DBC1BA] text-[#55423E] px-2 py-0.5 rounded">
                        ✓ {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Banner */}
              <div className="bg-[#FAF9F5] border border-[#DBC1BA] p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${isStreaming ? "bg-[#97422C] animate-ping" : "bg-green-600"}`} />
                  <span className="text-xs font-bold text-[#1B1C1A]">{streamStatusText}</span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-[#E9E8E4] px-2 py-0.5 rounded">
                  {isStreaming ? "Streaming SSE" : "Completed"}
                </span>
              </div>

              {/* Live SSE Activity Feed */}
              <div className="bg-white border border-[#DBC1BA] rounded-xl p-4 paper-shadow flex flex-col gap-3 max-h-[600px] overflow-y-auto">
                <div className="flex justify-between items-center pb-2 border-b border-[#EFEEEA]">
                  <h3 className="font-serif text-sm font-bold text-[#97422C] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">stream</span>
                    Live SSE Activity Timeline
                  </h3>
                  <span className="text-[10px] text-[#88726D] font-mono">{streamTimelineEvents.length} events logged</span>
                </div>

                <div className="space-y-3 text-xs">
                  {streamTimelineEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-xl border transition-all duration-300 flex flex-col gap-1.5 shadow-sm ${
                        ev.type === "section"
                          ? "bg-[#FAF9F5] border-[#97422C]/40 border-l-4 border-l-[#97422C]"
                          : ev.type === "complete"
                          ? "bg-green-50 border-green-300 text-green-900 border-l-4 border-l-green-600"
                          : ev.type === "research"
                          ? "bg-[#FDFBF7] border-[#DBC1BA] border-l-4 border-l-[#55423E]"
                          : "bg-white border-[#EFEEEA] border-l-4 border-l-[#DBC1BA]"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#1B1C1A] flex items-center gap-1.5">
                          {ev.type === "section" && <span className="text-[#97422C]">📝</span>}
                          {ev.type === "complete" && <span>🎉</span>}
                          {ev.type === "research" && <span>🔍</span>}
                          {ev.type === "status" && <span className="animate-spin text-[10px]">⚡</span>}
                          {ev.title}
                        </span>
                        <span className="text-[10px] text-[#88726D] font-mono">{ev.timestamp}</span>
                      </div>
                      {ev.detail && <p className="text-[#55423E] leading-relaxed text-[11px]">{ev.detail}</p>}
                    </div>
                  ))}
                  <div ref={timelineEndRef} />
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* RIGHT COLUMN: 60% WIDTH - LIVE DOCUMENT PREVIEW PANE     */}
            {/* -------------------------------------------------------- */}
            <div className="w-full lg:w-[60%] flex flex-col gap-4">
              {/* Sticky Action Bar */}
              <div className="bg-white border border-[#DBC1BA] rounded-xl p-3.5 paper-shadow flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#97422C] bg-[#FFDBD2] px-2.5 py-1 rounded">
                    {format.toUpperCase()} Document
                  </span>
                  <span className="text-xs font-bold text-[#55423E]">
                    {
                      outline.sections.filter((s, i) =>
                        Boolean(generatedSections[s.id] || generatedSections[i] || generatedSections[`sec_${i + 1}`] || (generatedSections as any)[s.title])
                      ).length
                    } of {outline.sections.length} sections live
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep("outline")}
                    className="text-xs font-semibold px-3 py-1.5 border border-[#DBC1BA] rounded-lg hover:bg-[#EFEEEA] transition-colors"
                  >
                    Edit Outline
                  </button>
                  <button
                    onClick={handleDownloadFile}
                    disabled={!isAssembledReady}
                    className={`text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition-all ${
                      isAssembledReady
                        ? "bg-[#97422C] text-white hover:bg-[#B65A42] cursor-pointer"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Download {format.toUpperCase()}
                  </button>
                </div>
              </div>

              {/* Styled Paper Preview Container (Updates live as sections arrive) */}
              <div className="bg-white border border-[#DBC1BA] p-6 sm:p-10 paper-shadow rounded-xl min-h-[600px] flex flex-col gap-6">
                {/* Paper Header */}
                <div className="text-center pb-6 border-b border-[#DBC1BA] flex flex-col gap-2">
                  <h1 className="font-serif text-2xl sm:text-3xl text-[#97422C] font-bold leading-tight">
                    {outline.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#55423E] italic">{outline.subtitle}</p>
                  <div className="text-[11px] text-[#88726D] mt-1">
                    Generated by <strong className="text-[#97422C]">Paperrrrrr</strong> • {new Date().toLocaleDateString()}
                  </div>
                </div>

                {/* Live Section Prose List with Active Shimmer Skeleton */}
                <div className="space-y-8 text-sm text-[#1B1C1A] leading-relaxed">
                  {outline.sections.map((sec, idx) => {
                    const proseContent = generatedSections[sec.id] || generatedSections[idx] || generatedSections[`sec_${idx + 1}`] || (generatedSections as any)[sec.title];
                    const isDraftingNow = isStreaming && activeGeneratingSectionIndex === idx && !proseContent;

                    return (
                      <div
                        key={sec.id}
                        className={`space-y-3 p-4 rounded-xl transition-all duration-300 ${
                          isDraftingNow
                            ? "bg-[#FAF9F5] border-2 border-[#97422C] shadow-md ring-2 ring-[#FFDBD2]"
                            : proseContent
                            ? "bg-transparent border border-transparent"
                            : "bg-[#FCFBFA] border border-[#EFEEEA] opacity-75"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-[#EFEEEA] pb-2">
                          <h2 className="font-serif text-lg font-bold text-[#97422C] flex items-center gap-2">
                            <span>{sec.title}</span>
                          </h2>
                          {isDraftingNow ? (
                            <span className="text-[11px] bg-[#97422C] text-white px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 animate-pulse shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                              ⚡ Gemini 2.5 Flash Drafting...
                            </span>
                          ) : proseContent ? (
                            <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">
                              ✓ Ready ({proseContent.length} chars)
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#88726D] font-mono">Queued</span>
                          )}
                        </div>

                        {proseContent ? (
                          <div className="prose text-xs sm:text-sm text-[#1B1C1A] leading-relaxed whitespace-pre-wrap animate-in fade-in duration-500">
                            {proseContent}
                          </div>
                        ) : isDraftingNow ? (
                          /* Visual in-progress shimmer skeleton for active section */
                          <div className="space-y-3 py-3">
                            <div className="text-xs text-[#55423E] font-medium flex items-center gap-1.5">
                              <span className="text-[#97422C] font-bold">Focus Brief:</span> {sec.brief}
                            </div>
                            <div className="space-y-2 pt-2">
                              <div className="h-3.5 bg-gradient-to-r from-[#DBC1BA]/40 via-[#97422C]/20 to-[#DBC1BA]/40 rounded animate-pulse w-full" />
                              <div className="h-3.5 bg-gradient-to-r from-[#DBC1BA]/40 via-[#97422C]/20 to-[#DBC1BA]/40 rounded animate-pulse w-[92%]" />
                              <div className="h-3.5 bg-gradient-to-r from-[#DBC1BA]/40 via-[#97422C]/20 to-[#DBC1BA]/40 rounded animate-pulse w-[96%]" />
                              <div className="h-3.5 bg-gradient-to-r from-[#DBC1BA]/40 via-[#97422C]/20 to-[#DBC1BA]/40 rounded animate-pulse w-[70%]" />
                            </div>
                            <div className="flex items-center gap-2 pt-2 text-[11px] text-[#97422C] font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#97422C] animate-bounce" />
                              Synthesizing verified research citations & institutional statistics...
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[#88726D] italic">{sec.brief}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* BYOK SETTINGS MODAL (STAGE 5)                                */}
      {/* ============================================================ */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DBC1BA] rounded-2xl p-6 max-w-md w-full paper-shadow flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-xl font-bold text-[#97422C] flex items-center gap-2">
                <span className="material-symbols-outlined">key</span>
                Bring Your Own Key (BYOK)
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <p className="text-xs text-[#55423E]">
              Optionally paste your personal API keys from Google AI Studio or OpenAI. Keys are stored encrypted with AES-256.
            </p>

            <form onSubmit={handleSaveKeys} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="font-bold text-[#1B1C1A] block mb-1">
                  Google Gemini API Key (Google AI Studio)
                </label>
                <input
                  type="password"
                  placeholder={hasCustomGeminiKey ? `Current: ${geminiKeyMasked}` : "AIzaSy..."}
                  value={customGeminiKeyInput}
                  onChange={(e) => setCustomGeminiKeyInput(e.target.value)}
                  className="w-full p-2.5 border border-[#DBC1BA] rounded-lg font-mono text-xs"
                />
                <span className="text-[10px] text-[#88726D] mt-0.5 block">
                  {hasCustomGeminiKey ? "✓ Custom Gemini key active" : "Using Paperrrrrr shared GEMINI_API_KEY"}
                </span>
              </div>

              <div>
                <label className="font-bold text-[#1B1C1A] block mb-1">
                  OpenAI API Key (Optional Fallback)
                </label>
                <input
                  type="password"
                  placeholder={hasCustomOpenAIKey ? `Current: ${openaiKeyMasked}` : "sk-..."}
                  value={customOpenAIKeyInput}
                  onChange={(e) => setCustomOpenAIKeyInput(e.target.value)}
                  className="w-full p-2.5 border border-[#DBC1BA] rounded-lg font-mono text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex-1 py-2.5 bg-[#97422C] text-white font-bold text-xs rounded-lg hover:bg-[#B65A42] transition-colors"
                >
                  {savingSettings ? "Saving..." : "Save Custom Keys"}
                </button>
                {(hasCustomGeminiKey || hasCustomOpenAIKey) && (
                  <button
                    type="button"
                    onClick={handleClearKeys}
                    className="px-3 py-2.5 border border-red-300 text-red-700 text-xs font-bold rounded-lg hover:bg-red-50"
                  >
                    Clear Keys
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* AUTH MODAL: EMAIL/PASSWORD & GOOGLE SIGN-IN (STAGE 1 & 4)    */}
      {/* ============================================================ */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DBC1BA] rounded-2xl p-6 max-w-md w-full paper-shadow flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-xl font-bold text-[#97422C]">
                {authMode === "signup" ? "Create Paperrrrrr Account" : "Sign In to Paperrrrrr"}
              </h3>
              <button onClick={() => setShowAuthModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <p className="text-xs text-[#55423E]">Save generated documents and access your history anywhere.</p>

            {/* Google Sign-In Option (Stage 4) */}
            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full py-2.5 px-4 border border-[#DBC1BA] rounded-lg text-xs font-bold text-[#1B1C1A] hover:bg-[#FAF9F5] transition-colors flex items-center justify-center gap-2 paper-shadow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center my-1">
              <div className="flex-1 border-t border-[#EFEEEA]"></div>
              <span className="px-2 text-[10px] text-[#88726D] uppercase">or with email</span>
              <div className="flex-1 border-t border-[#EFEEEA]"></div>
            </div>

            {/* Email & Password Flow */}
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
              {authMode === "signup" && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="p-2.5 border border-[#DBC1BA] rounded-lg text-xs"
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email Address"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="p-2.5 border border-[#DBC1BA] rounded-lg text-xs"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="p-2.5 border border-[#DBC1BA] rounded-lg text-xs"
                required
              />
              <button
                type="submit"
                className="py-2.5 bg-[#97422C] text-white font-bold text-xs rounded-lg hover:bg-[#B65A42] transition-colors"
              >
                {authMode === "signup" ? "Sign Up & Create Session" : "Sign In"}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-[#DBC1BA]">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}
                className="text-xs text-[#97422C] hover:underline"
              >
                {authMode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-[#DBC1BA] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-[#88726D]">
          © 2026 <strong>Paperrrrrr</strong> — Autonomous Research & Document Generation Engine with Gemini 2.5 Flash
        </div>
      </footer>
    </div>
  );
}
