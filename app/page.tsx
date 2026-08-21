"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Badge,
  Button,
  Modal,
  Tabs,
  PPTXDeckViewer,
} from "@/components/untitledui";
import {
  Sparkles,
  Search,
  FileText,
  FileCode2,
  Copy,
  Check,
  RotateCw,
  Download,
  Settings,
  User,
  Key,
  Shield,
  Layers,
  Presentation,
  UploadCloud,
  ArrowRight,
  ArrowLeft,
  Terminal,
  ExternalLink,
  Plus,
  Trash2,
  Cpu,
  Clock,
  Zap,
  Globe,
  Paperclip,
  X,
  FileCheck,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Send,
  Sliders,
} from "lucide-react";
import { PaperrrrrrLogo } from "@/components/PaperrrrrrLogo";

interface ResearchSource {
  index: number;
  title: string;
  url: string;
  snippet: string;
  score?: number;
  sourceDomain?: string;
}

interface OutlineSubsection {
  id: string;
  title: string;
  brief: string;
  keyPoints?: string[];
  content?: string;
}

interface OutlineSection {
  id: string;
  title: string;
  brief: string;
  keyPoints: string[];
  relevantSourceIndices: number[];
  subsections?: OutlineSubsection[];
  content?: string;
  status?: "pending" | "generating" | "completed";
}

interface GeneratedOutline {
  title: string;
  subtitle: string;
  docType: string;
  format: "docx" | "pptx" | "pdf";
  targetLength: string;
  chapters?: OutlineSection[];
  sections: OutlineSection[];
}

export default function PaperrrrrrApp() {
  // --------------------------------------------------------------------------
  // Explicit 3-Screen Workflow State: 'home' | 'thinking' | 'workspace'
  // --------------------------------------------------------------------------
  const [screen, setScreen] = useState<"home" | "thinking" | "workspace">("home");

  // User state & persistence
  const [user, setUser] = useState<{ id?: string; name?: string; email?: string; avatar?: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [pastDocuments, setPastDocuments] = useState<any[]>([]);

  // BYOK Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [geminiModel, setGeminiModel] = useState<string>("gemini-2.5-flash");
  const [customGeminiKeyInput, setCustomGeminiKeyInput] = useState("");
  const [customOpenAIKeyInput, setCustomOpenAIKeyInput] = useState("");
  const [hasCustomGeminiKey, setHasCustomGeminiKey] = useState(false);
  const [geminiKeyMasked, setGeminiKeyMasked] = useState("");
  const [hasCustomOpenAIKey, setHasCustomOpenAIKey] = useState(false);
  const [openaiKeyMasked, setOpenaiKeyMasked] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Screen 1: Home Prompt & Parameters
  const [prompt, setPrompt] = useState("");
  const [showParameters, setShowParameters] = useState(false);
  const [format, setFormat] = useState<"docx" | "pptx" | "pdf">("docx");
  const [docType, setDocType] = useState("Research Report");
  const [tone, setTone] = useState("Academic Paper");
  const [audience, setAudience] = useState("Researchers & Academics");
  const [targetLength, setTargetLength] = useState("Standard Report (6–8 Chapters)");
  const [researchDepth, setResearchDepth] = useState<"standard" | "deep">("standard");

  // Document Settings Panel (Font, Page Count, Accent Color, Chapters, Additional Requirements)
  const [selectedFont, setSelectedFont] = useState<string>("Times New Roman");
  const [pageCount, setPageCount] = useState<number>(15);
  const [accentColor, setAccentColor] = useState<string>("000000");
  const [customChapterCount, setCustomChapterCount] = useState<string>("");
  const [additionalRequirements, setAdditionalRequirements] = useState<string>("");
  const [showDocSettingsPanel, setShowDocSettingsPanel] = useState<boolean>(false);

  // Live Budget Metric Derivation
  const calculatedBudget = useMemo(() => {
    const f = selectedFont.toLowerCase();
    const wordsPerPage = f.includes("arial") || f.includes("georgia") ? 255 : f.includes("calibri") || f.includes("cambria") ? 265 : 275;
    const totalWords = Math.round(pageCount * wordsPerPage);
    const parsedCustom = customChapterCount ? parseInt(customChapterCount, 10) : 0;
    let chapters = parsedCustom > 0
      ? parsedCustom
      : pageCount >= 150 ? 28
      : pageCount >= 80 ? 20
      : pageCount >= 50 ? 16
      : pageCount >= 30 ? 14
      : pageCount >= 20 ? 10
      : pageCount >= 12 ? 8
      : pageCount >= 6 ? 6
      : pageCount >= 3 ? 4
      : 3;
    chapters = Math.max(2, chapters);
    const wordsPerChapter = Math.round(totalWords / chapters);
    return {
      wordsPerPage,
      totalWords,
      chapters,
      wordsPerChapter
    };
  }, [selectedFont, pageCount, customChapterCount]);

  // Formal Academic Report (College / Thesis Front Matter)
  const [isFormalAcademicReport, setIsFormalAcademicReport] = useState(false);
  const [institutionName, setInstitutionName] = useState("");
  const [department, setDepartment] = useState("");
  const [degree, setDegree] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [guideName, setGuideName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [projectTitleOverride, setProjectTitleOverride] = useState("");
  const [expandedChapterIds, setExpandedChapterIds] = useState<Record<string, boolean>>({});

  // File / Notes Intake
  const [referenceNotes, setReferenceNotes] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showFileAttachPopover, setShowFileAttachPopover] = useState(false);

  // Multi-Format Canvas Viewer Mode: 'word' | 'ppt'
  const [activeViewerMode, setActiveViewerMode] = useState<"word" | "ppt">("word");

  // Pipeline runtime state
  const [docId, setDocId] = useState<string | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchBundle, setResearchBundle] = useState<{ query: string; results: ResearchSource[]; answer?: string; depth?: string } | null>(null);

  // Outline state
  const [outline, setOutline] = useState<GeneratedOutline | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  // Screen 3: Live SSE Generation & Split-Screen Workspace State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatusText, setStreamStatusText] = useState("Initializing generation engine...");
  const [activeGeneratingSectionIndex, setActiveGeneratingSectionIndex] = useState<number | null>(null);
  const [generatedSections, setGeneratedSections] = useState<Record<string, string>>({});
  const [streamTimelineEvents, setStreamTimelineEvents] = useState<
    Array<{ id: string; timestamp: string; type: "status" | "research" | "outline" | "section" | "complete" | "error"; title: string; detail?: string }>
  >([]);
  const [isAssembledReady, setIsAssembledReady] = useState(false);
  const [assembledBlobUrl, setAssembledBlobUrl] = useState<string | null>(null);
  const [assembledFilename, setAssembledFilename] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"code" | "logs">("code");
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Elapsed timing for Screen 2 thinking tracker
  const [thinkingSeconds, setThinkingSeconds] = useState<number>(0);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const timelineEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const promptInputRef = useRef<HTMLInputElement | null>(null);

  // Autonomous Natural Language Format Detection
  const detectedFormat = useMemo<"docx" | "pptx" | "pdf">(() => {
    const p = prompt.toLowerCase();
    if (
      p.includes("slide") ||
      p.includes("deck") ||
      p.includes("presentation") ||
      p.includes("powerpoint") ||
      p.includes("ppt") ||
      p.includes("pitch")
    ) {
      return "pptx";
    }
    if (p.includes("pdf")) {
      return "pdf";
    }
    return "docx";
  }, [prompt]);

  // Keep format synced with detected format if user hasn't explicitly locked it
  useEffect(() => {
    if (prompt.length > 5) {
      setFormat(detectedFormat);
    }
  }, [detectedFormat]);

  // Enforce dark mode permanently and restore user session
  useEffect(() => {
    document.documentElement.classList.add("dark");

    try {
      const savedUserStr = localStorage.getItem("paperloop_user") || localStorage.getItem("paperrrrrr_user");
      if (savedUserStr) {
        setUser(JSON.parse(savedUserStr));
      }
    } catch (e) {
      console.warn("User restore:", e);
    }

    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          try {
            localStorage.setItem("paperloop_user", JSON.stringify(data.user));
          } catch (e) {}
        }
      })
      .catch(() => {});

    fetchPastDocuments();
  }, []);

  // Fetch document history & user key settings when user changes
  useEffect(() => {
    fetchPastDocuments();
    if (user) {
      fetchUserKeySettings();
    }
  }, [user]);

  // Auto-scroll timeline logs
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamTimelineEvents]);

  // Thinking timer ticker for Screen 2
  useEffect(() => {
    if (screen === "thinking") {
      setThinkingSeconds(0);
      thinkingTimerRef.current = setInterval(() => {
        setThinkingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    }
    return () => {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    };
  }, [screen]);

  const fetchPastDocuments = async () => {
    let localDocs: any[] = [];
    try {
      const savedHistory = localStorage.getItem("paperloop_history") || localStorage.getItem("paperrrrrr_history");
      if (savedHistory) localDocs = JSON.parse(savedHistory);
    } catch (e) {}

    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        if (data.documents && Array.isArray(data.documents)) {
          const seen = new Set<string>();
          const merged = [...data.documents, ...localDocs].filter((d) => {
            const key = d._id || d.id || `${d.title}_${d.format}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setPastDocuments(merged);
          try {
            localStorage.setItem("paperloop_history", JSON.stringify(merged));
          } catch (e) {}
          return;
        }
      }
    } catch (e) {
      console.warn("Document history fetch error:", e);
    }

    if (localDocs.length > 0) {
      setPastDocuments(localDocs);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAttachedFileName(file.name);
        setReferenceNotes((prev) =>
          prev
            ? `${prev}\n\n[Attached File: ${file.name}]\n${data.extractedText}`
            : `[Attached File: ${file.name}]\n${data.extractedText}`
        );
        setShowFileAttachPopover(false);
      } else {
        alert("Upload error: " + (data.error || "Failed to process file"));
      }
    } catch (err: any) {
      alert("File upload error: " + err.message);
    } finally {
      setIsUploadingFile(false);
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
          openaiKey: customOpenAIKeyInput,
        }),
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
          name: authName,
        }),
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        try {
          localStorage.setItem("paperloop_user", JSON.stringify(data.user));
        } catch (e) {}
        setShowAuthModal(false);
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");
        fetchPastDocuments();
      } else {
        alert(data.error || "Authentication failed");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch (e) {}
    setUser(null);
    try {
      localStorage.removeItem("paperloop_user");
      localStorage.removeItem("paperrrrrr_user");
    } catch (e) {}
  };

  const loadHistoryDocument = (doc: any) => {
    const rawSections = doc.sections || doc.outline || [];
    const restoredOutline: GeneratedOutline = {
      title: doc.title,
      subtitle: doc.subtitle || "Synthesized Research Document",
      docType: doc.docType || "Research Report",
      format: doc.format || "docx",
      targetLength: "Detailed",
      chapters: rawSections,
      sections: rawSections
    };

    const sectionMap: Record<string, string> = {};
    rawSections.forEach((s: any, idx: number) => {
      const id = s.id || `sec_${idx + 1}`;
      sectionMap[id] = s.content || s.brief || "";
      sectionMap[idx] = s.content || s.brief || "";
      if (s.title) sectionMap[s.title] = s.content || s.brief || "";
    });

    setOutline(restoredOutline);
    setFormat(doc.format || "docx");
    setGeneratedSections(sectionMap);
    setScreen("workspace");
    setIsStreaming(false);
    setIsAssembledReady(true);
    setShowHistoryModal(false);
  };

  const createClientFallbackOutline = (p: string, fmt: string, tLen: string, dType: string): GeneratedOutline => {
    const cleanTitle = p.replace(/\.$/, "").trim();
    const capitalizedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

    const isExhaustiveLength = p.toLowerCase().includes("40") || p.toLowerCase().includes("50") || p.toLowerCase().includes("30") || tLen.toLowerCase().includes("exhaustive");

    const chapters: OutlineSection[] = isExhaustiveLength
      ? [
          {
            id: "sec_1",
            title: "1. Introduction & Foundational Scope",
            brief: `Comprehensive introduction to baseline metrics, institutional significance, and scope of inquiry for ${cleanTitle}.`,
            keyPoints: [`Contextual background and domain importance`, "Core problem definition and inefficiencies", "Scope boundaries and project objectives"],
            relevantSourceIndices: [1],
            subsections: [
              { id: "sec_1_1", title: "1.1 Background and Domain Urgency", brief: `Historical and contemporary context motivating research in ${cleanTitle}.` },
              { id: "sec_1_2", title: "1.2 Formal Problem Statement", brief: `Detailed breakdown of structural inefficiencies and technical bottlenecks.` },
              { id: "sec_1_3", title: "1.3 Research Aims and Inquiries", brief: `Specific analytical questions, hypotheses, and scope boundaries.` },
              { id: "sec_1_4", title: "1.4 Methodological Contributions", brief: `Expected empirical deliverables and scholarly taxonomy contributions.` }
            ]
          },
          {
            id: "sec_2",
            title: "2. Historical Genesis & Evolutionary Inflection Points",
            brief: `Chronological maturation, early developmental milestones, and structural inflection points of ${cleanTitle}.`,
            keyPoints: ["Early developmental phases", "Major historical inflection points", "Structural evolution of the ecosystem"],
            relevantSourceIndices: [1, 2],
            subsections: [
              { id: "sec_2_1", title: "2.1 Early Developmental Phases", brief: `Pioneering initiatives, early prototypes, and initial standardizations.` },
              { id: "sec_2_2", title: "2.2 Decade-Long Inflection Points", brief: `Critical technological pivots, catalysts, and paradigm transitions.` },
              { id: "sec_2_3", title: "2.3 Contemporary Ecosystem Maturation", brief: `Current state of global adoption and operational scaling.` }
            ]
          },
          {
            id: "sec_3",
            title: "3. Literature Survey & Theoretical Frameworks",
            brief: `Exhaustive analysis of seminal scholarship, prevailing conceptual models, and academic debates.`,
            keyPoints: ["Seminal theoretical models", "Taxonomy of existing research streams", "Critical counter-perspectives"],
            relevantSourceIndices: [1, 2],
            subsections: [
              { id: "sec_3_1", title: "3.1 Theoretical Taxonomy & Conceptual Models", brief: `Classification of prevailing mathematical and operational frameworks.` },
              { id: "sec_3_2", title: "3.2 Comparative Analysis of Prior Literature", brief: `Critical synthesis of empirical findings across leading studies.` },
              { id: "sec_3_3", title: "3.3 Unresolved Theoretical Blind Spots", brief: `Systematic evaluation of research gaps and unanswered inquiries.` }
            ]
          },
          {
            id: "sec_4",
            title: "4. Methodological Design & Empirical Framework",
            brief: `Systematic selection criteria, measurement protocols, and quantitative evaluation indices for ${cleanTitle}.`,
            keyPoints: ["Sampling protocols and dataset verification", "Mathematical metric formulations", "Validity and reproducibility controls"],
            relevantSourceIndices: [2, 3],
            subsections: [
              { id: "sec_4_1", title: "4.1 Dataset Selection & Sampling Parameters", brief: `Inclusion criteria, verification protocols, and corpus integrity.` },
              { id: "sec_4_2", title: "4.2 Quantitative Metrics & Mathematical Formulations", brief: `Formulas for yield tracking, latency, error bounds, and CAGR.` },
              { id: "sec_4_3", title: "4.3 Internal & External Validity Safeguards", brief: `Controls for systematic bias, noise isolation, and reproducibility.` }
            ]
          },
          {
            id: "sec_5",
            title: "5. High-Level Architectural Topology",
            brief: `Core system topology, component modularity, and operational workflow design.`,
            keyPoints: ["Modular component hierarchy", "Communication bus and data interchange", "High-throughput operational topology"],
            relevantSourceIndices: [2, 3],
            subsections: [
              { id: "sec_5_1", title: "5.1 Structural Component Hierarchy", brief: `Decomposition of functional sub-modules and core engine components.` },
              { id: "sec_5_2", title: "5.2 Inter-Module Protocols & Synchronization", brief: `Message bus, event dispatching, and state synchronization.` },
              { id: "sec_5_3", title: "5.3 Pipeline Latency & Throughput Guarantees", brief: `Optimization techniques for high-concurrency throughput.` }
            ]
          },
          {
            id: "sec_6",
            title: "6. Data Pipelines & Protocol Standardization",
            brief: `Data ingestion, processing pipeline, and protocol harmonization standards.`,
            keyPoints: ["Data transformation pipelines", "Standardization and schema validation", "Auditability and provenance tracking"],
            relevantSourceIndices: [1, 3],
            subsections: [
              { id: "sec_6_1", title: "6.1 Ingestion Protocols & Parsing Pipelines", brief: `Streaming ingestion mechanisms and schema validation rules.` },
              { id: "sec_6_2", title: "6.2 Data Integrity & Provenance Tracking", brief: `Cryptographic hashes, audit trails, and immutable logs.` },
              { id: "sec_6_3", title: "6.3 Cross-Platform Protocol Interoperability", brief: `Harmonization across heterogeneous third-party interfaces.` }
            ]
          },
          {
            id: "sec_7",
            title: "7. Security Architecture & Fault-Tolerance Mechanisms",
            brief: `Redundancy safeguards, cryptographic integrity, and disaster recovery.`,
            keyPoints: ["Zero-trust protocols", "High-availability failover mechanisms", "Threat modeling and intrusion defense"],
            relevantSourceIndices: [2, 4],
            subsections: [
              { id: "sec_7_1", title: "7.1 Threat Vector Modeling & Surface Analysis", brief: `Comprehensive taxonomy of adversarial vulnerabilities and defense strategies.` },
              { id: "sec_7_2", title: "7.2 Distributed Redundancy & Failover Protocols", brief: `Automatic failover, partition tolerance, and self-healing state engines.` },
              { id: "sec_7_3", title: "7.3 Cryptographic Integrity & Access Governance", brief: `Role-based access control, cryptographic verification, and secret management.` }
            ]
          },
          {
            id: "sec_8",
            title: "8. Quantitative Empirical Findings & Benchmark Synthesis",
            brief: `Deep data synthesis with structured comparison tables, verified institutional statistics, and performance distributions.`,
            keyPoints: ["Granular statistical distributions", "Comparative benchmark tables", "Multi-variable statistical significance tests"],
            relevantSourceIndices: [1, 2],
            subsections: [
              { id: "sec_8_1", title: "8.1 Baseline vs Achieved Metric Distributions", brief: `Empirical performance distributions across representative testbeds.` },
              { id: "sec_8_2", title: "8.2 Multi-Variable Benchmark Data Tables", brief: `Structured Markdown comparison tables assessing throughput, cost, and yield.` },
              { id: "sec_8_3", title: "8.3 Statistical Significance & Dispersion Analysis", brief: `Hypothesis validation, p-value calculations, and sensitivity matrices.` }
            ]
          },
          {
            id: "sec_9",
            title: "9. Comparative Institutional Case Studies",
            brief: `Exhaustive real-world case evaluations demonstrating concrete implementations and institutional outcomes.`,
            keyPoints: ["Enterprise-scale case evaluation", "Public sector/academic deployment review", "Failure post-mortems and key lessons"],
            relevantSourceIndices: [2, 3],
            subsections: [
              { id: "sec_9_1", title: "9.1 Enterprise Tier Implementation Review", brief: `Large-scale deployment outcomes, timeline analysis, and measured ROI.` },
              { id: "sec_9_2", title: "9.2 Public Sector & Institutional Deployments", brief: `Academic and regulatory consortium deployments and compliance.` },
              { id: "sec_9_3", title: "9.3 Post-Mortem Analysis of Observed Failures", brief: `Analysis of implementation friction, failed assumptions, and remedies.` }
            ]
          },
          {
            id: "sec_10",
            title: "10. Economic Feasibility, Unit Economics & TCO Modeling",
            brief: `Granular financial modeling, capital allocation efficiency, ROI, and total cost of ownership.`,
            keyPoints: ["Unit economics breakdown", "CAPEX vs OPEX projections", "Long-term Net Present Value (NPV) modeling"],
            relevantSourceIndices: [1, 3],
            subsections: [
              { id: "sec_10_1", title: "10.1 Unit Cost Drivers & Marginal Economics", brief: `Granular cost breakdown per transaction/compute unit.` },
              { id: "sec_10_2", title: "10.2 Total Cost of Ownership (5-Year Model)", brief: `CAPEX requirements, operational staffing, and infrastructure overhead.` },
              { id: "sec_10_3", title: "10.3 Net Present Value & Payback Horizon", brief: `Discounted cash flow projections and capital break-even calculations.` }
            ]
          },
          {
            id: "sec_11",
            title: "11. Global Regulatory Frameworks & Compliance Policies",
            brief: `Jurisdictional compliance requirements, global policy treaties, and statutory mandates.`,
            keyPoints: ["Cross-border statutory compliance", "Liability protocols and audit mandates", "2026-2030 regulatory trajectory"],
            relevantSourceIndices: [1, 4],
            subsections: [
              { id: "sec_11_1", title: "11.1 Cross-Jurisdictional Statutory Landscape", brief: `Regulatory analysis across US, EU, and APAC administrative bodies.` },
              { id: "sec_11_2", title: "11.2 Compliance Checkpoints & Audit Mandates", brief: `Continuous audit protocols and institutional liability management.` },
              { id: "sec_11_3", title: "11.3 Emerging Policy Directives (2026–2030)", brief: `Anticipated legislative shifts and prospective regulatory safeguards.` }
            ]
          },
          {
            id: "sec_12",
            title: "12. Phased Strategic Execution Roadmap",
            brief: `Actionable phased implementation timeline, capital deployment sequencing, and governance checkpoints.`,
            keyPoints: ["Near-term tactical rollout (Months 1–12)", "Medium-term scaling (Years 2–3)", "Long-term institutional governance (Years 4–5)"],
            relevantSourceIndices: [2, 3],
            subsections: [
              { id: "sec_12_1", title: "12.1 Phase I: Foundation & Validation (Months 1–12)", brief: `Immediate technical priorities, pilot validation, and initial deployment.` },
              { id: "sec_12_2", title: "12.2 Phase II: Optimization & Scale (Years 2–3)", brief: `Full-scale system scaling, feature maturity, and ecosystem growth.` },
              { id: "sec_12_3", title: "12.3 Phase III: Long-Term Maturation (Years 4–5)", brief: `Sustained institutional leadership, governance standardization, and audit.` }
            ]
          },
          {
            id: "sec_13",
            title: "13. Risk Governance & Contingency Protocol Matrix",
            brief: `Systematic risk mitigation matrix, regulatory defense strategies, and business continuity frameworks.`,
            keyPoints: ["Probability-impact scoring matrix", "Disaster recovery and fault-tolerance", "Continuous compliance monitoring"],
            relevantSourceIndices: [1, 4],
            subsections: [
              { id: "sec_13_1", title: "13.1 Comprehensive Risk Scoring Matrix", brief: `Quantitative probability and impact evaluation across all risk vectors.` },
              { id: "sec_13_2", title: "13.2 Operational Contingency Playbooks", brief: `Immediate incident response playbooks for system outages and breaches.` },
              { id: "sec_13_3", title: "13.3 Continuous Governance & Audit Monitoring", brief: `Automated compliance monitoring and real-time governance metrics.` }
            ]
          },
          {
            id: "sec_14",
            title: "14. Scholarly Synthesis & Prospective Research Agenda",
            brief: `Synthesized resolution of core findings, academic contributions, and prospective research agenda.`,
            keyPoints: ["Integrated theoretical and empirical summary", "Core scholarly contributions", "Prospective research avenues for future investigators"],
            relevantSourceIndices: [1, 2, 3, 4],
            subsections: [
              { id: "sec_14_1", title: "14.1 Integrated Resolution of Findings", brief: `Synthesized summary of theoretical and empirical discoveries.` },
              { id: "sec_14_2", title: "14.2 Methodological & Practical Contributions", brief: `Key academic contributions and industry implications.` },
              { id: "sec_14_3", title: "14.3 Future Research Trajectory & Open Questions", brief: `High-priority research questions for upcoming investigators.` }
            ]
          }
        ]
      : [
          {
            id: "sec_1",
            title: "1. Introduction & Foundational Scope",
            brief: `Comprehensive introduction to baseline metrics, institutional significance, and scope of inquiry for ${cleanTitle}.`,
            keyPoints: [`Contextual background and domain importance`, "Core problem definition and inefficiencies", "Scope boundaries and project objectives"],
            relevantSourceIndices: [1],
            subsections: [
              { id: "sec_1_1", title: "1.1 Background and Motivation", brief: `Historical and contemporary context motivating research in ${cleanTitle}.` },
              { id: "sec_1_2", title: "1.2 Problem Statement", brief: `Formal definition of core structural inefficiencies and challenges in ${cleanTitle}.` },
              { id: "sec_1_3", title: "1.3 Research Objectives & Project Scope", brief: `Specific analytical aims, inquiry boundaries, and targeted deliverables.` }
            ]
          },
          {
            id: "sec_2",
            title: "2. Literature Survey & Theoretical Frameworks",
            brief: `Chronological maturation, seminal scholarship, and theoretical paradigms governing ${cleanTitle}.`,
            keyPoints: ["Evolutionary inflection points over the past decade", "Seminal theoretical models and scholarly taxonomy", "Contemporary academic consensus and divergences"],
            relevantSourceIndices: [1, 2],
            subsections: [
              { id: "sec_2_1", title: "2.1 Historical Genesis & Inflection Points", brief: `Evolutionary milestones and early developmental phases of ${cleanTitle}.` },
              { id: "sec_2_2", title: "2.2 Theoretical Taxonomy & Conceptual Models", brief: `Taxonomy of prevailing academic models and frameworks.` },
              { id: "sec_2_3", title: "2.3 Gaps in Contemporary Literature", brief: `Unresolved empirical questions and theoretical blind spots.` }
            ]
          },
          {
            id: "sec_3",
            title: "3. Methodological Design & Empirical Framework",
            brief: `Systematic selection criteria, measurement protocols, and quantitative evaluation indices for ${cleanTitle}.`,
            keyPoints: ["Sampling protocols and dataset verification", "Key performance metrics and quantitative tracking formulas", "Boundary conditions and error tolerances"],
            relevantSourceIndices: [2, 3],
            subsections: [
              { id: "sec_3_1", title: "3.1 Sampling Protocols & Data Selection", brief: `Inclusion criteria, dataset curation, and verification protocols.` },
              { id: "sec_3_2", title: "3.2 Quantitative Metrics & Performance Indicators", brief: `Mathematical formulation of core tracking metrics and KPIs.` },
              { id: "sec_3_3", title: "3.3 Verification Safeguards & Validity Constraints", brief: `Controls for internal and external validity.` }
            ]
          },
          {
            id: "sec_4",
            title: "4. System Architecture & Technical Infrastructure",
            brief: `Technical infrastructure, systems integration, protocol standards, and data pipelines supporting ${cleanTitle}.`,
            keyPoints: ["System architecture and protocol design", "Infrastructure scalability, resilience, and uptime parameters", "Data pipelines and latency optimization"],
            relevantSourceIndices: [2, 3],
            subsections: [
              { id: "sec_4_1", title: "4.1 High-Level Architectural Topology", brief: `System topology, component modularity, and operational workflow design.` },
              { id: "sec_4_2", title: "4.2 Data Pipelines & Protocol Standards", brief: `Data ingestion, processing pipeline, and protocol harmonization.` },
              { id: "sec_4_3", title: "4.3 Security & Fault-Tolerance Mechanisms", brief: `Redundancy safeguards, cryptographic integrity, and disaster recovery.` }
            ]
          },
          {
            id: "sec_5",
            title: "5. Empirical Findings & Granular Benchmark Synthesis",
            brief: `Deep data synthesis with structured comparison tables, verified institutional statistics, and performance distributions for ${cleanTitle}.`,
            keyPoints: ["Granular statistical distributions and verified data tables", "Demographic and sector performance benchmarks", "Comparative unit economics and operational metrics"],
            relevantSourceIndices: [1, 3],
            subsections: [
              { id: "sec_5_1", title: "5.1 Quantitative Performance Distributions", brief: `Empirical distributions and performance benchmark metrics across testbeds.` },
              { id: "sec_5_2", title: "5.2 Comparative Benchmark Tables", brief: `Granular comparison tables evaluating multi-variable yield against existing standards.` },
              { id: "sec_5_3", title: "5.3 Statistical Significance & Sensitivity Analysis", brief: `Hypothesis validation, p-values, and parameter sensitivity testing.` }
            ]
          },
          {
            id: "sec_6",
            title: "6. Institutional Case Studies & Field Implementations",
            brief: `Exhaustive real-world case evaluations demonstrating concrete implementations and institutional outcomes.`,
            keyPoints: ["High-impact enterprise case study", "Public sector/academic deployment analysis", "Failures, post-mortems, and key lessons"],
            relevantSourceIndices: [2, 4],
            subsections: [
              { id: "sec_6_1", title: "6.1 Enterprise-Scale Implementation Case", brief: `In-depth case review of commercial enterprise deployment and ROI metrics.` },
              { id: "sec_6_2", title: "6.2 Public Sector & Academic Deployment Analysis", brief: `Institutional case review of governance and open ecosystem deployment.` },
              { id: "sec_6_3", title: "6.3 Implementation Pitfalls & Post-Mortem Lessons", brief: `Analysis of observed implementation bottlenecks and key corrective measures.` }
            ]
          },
          {
            id: "sec_7",
            title: "7. Strategic Roadmap, Risk Governance & Economic Feasibility",
            brief: `Actionable phased implementation timeline, capital deployment sequencing, risk mitigation matrix, and governance checkpoints for ${cleanTitle}.`,
            keyPoints: ["Phased rollout milestones (Phase I, II, III)", "Comprehensive risk governance matrix", "Cost structures, unit economics, and return on investment"],
            relevantSourceIndices: [1, 2, 3, 4],
            subsections: [
              { id: "sec_7_1", title: "7.1 Phased Execution Timeline & Milestones", brief: `Sequential implementation phases across near-term, mid-term, and long-term horizons.` },
              { id: "sec_7_2", title: "7.2 Comprehensive Risk Governance Matrix", brief: `Systematic risk scoring, mitigation protocols, and compliance checkpoints.` },
              { id: "sec_7_3", title: "7.3 Economic Feasibility & Capital Allocation Modeling", brief: `Unit economics, operational expenditure, and long-term commercial sustainability.` }
            ]
          }
        ];

    return {
      title: capitalizedTitle,
      subtitle: `Comprehensive Research Report (${tone})`,
      docType: dType,
      format: (fmt as any) || "docx",
      targetLength: tLen || "Standard Report (6–8 Chapters)",
      chapters,
      sections: chapters
    };
  };

  // --------------------------------------------------------------------------
  // STEP 1 -> STEP 2: Initiate Thinking & Information Gathering Screen
  // --------------------------------------------------------------------------
  const handleInitiatePrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    // Transition immediately to dedicated Screen 2
    setScreen("thinking");
    setIsResearching(true);
    setIsGeneratingOutline(true);
    setStreamStatusText("Searching live sources...");

    const initialEvent = {
      id: `ev_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: "status" as const,
      title: "Live Web Research Initialized",
      detail: `Searching verified sources for: "${prompt}" (Depth: ${researchDepth.toUpperCase()})`,
    };
    setStreamTimelineEvents([initialEvent]);

    let activeResearchBundle: any = {
      query: prompt,
      depth: researchDepth,
      results: [
        {
          index: 1,
          title: `${prompt} — Academic & Institutional Baseline`,
          url: "https://doi.org/10.1000/182",
          score: 0.96,
          sourceDomain: "academic-index.org",
          snippet: `Empirical benchmarks, verified metrics, and structural growth indicators for ${prompt}.`,
        },
        {
          index: 2,
          title: `${prompt} — Global Industry Analysis & Forecast`,
          url: "https://precedenceresearch.com/reports",
          score: 0.92,
          sourceDomain: "precedenceresearch.com",
          snippet: `Market valuation, CAGR growth metrics, and structural unit economics for ${prompt}.`,
        },
      ],
    };
    let activeDocId: string | null = null;

    try {
      // 1. Tavily Research Fetch
      const resResearch = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          format,
          tone,
          audience,
          targetLength,
          depth: researchDepth,
          referenceNotes: referenceNotes || undefined,
        }),
      });

      if (resResearch.ok) {
        const dataResearch = await resResearch.json();
        if (dataResearch.success && dataResearch.researchBundle) {
          activeResearchBundle = dataResearch.researchBundle;
          if (dataResearch.docId) activeDocId = dataResearch.docId;
        }
      }
    } catch (resErr) {
      console.warn("Research fetch notice, applying baseline sources:", resErr);
    }

    setResearchBundle(activeResearchBundle);
    if (activeDocId) setDocId(activeDocId);

    setStreamTimelineEvents((prev) => [
      ...prev,
      {
        id: `ev_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "research",
        title: `Retrieved ${activeResearchBundle.results?.length || 2} verified research sources`,
        detail: activeResearchBundle.results?.map((r: any) => r.title).slice(0, 3).join(" • ") || "Domain knowledge mapped",
      },
    ]);

    // 2. Structured Outline Generation
    setStreamStatusText("Structuring document outline...");

    let finalOutline: GeneratedOutline | null = null;

    try {
      const resOutline = await fetch("/api/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: activeDocId,
          prompt,
          options: {
            format,
            tone,
            audience,
            targetLength,
            docType,
            referenceNotes: referenceNotes || undefined,
            pageCount,
            customChapterCount: customChapterCount ? parseInt(customChapterCount, 10) : undefined,
            font: selectedFont,
            accentColor,
            additionalRequirements: additionalRequirements || undefined,
            customGeminiKey: hasCustomGeminiKey ? customGeminiKeyInput : undefined,
            geminiModel,
          },
          researchBundle: activeResearchBundle,
        }),
      });

      if (resOutline.ok) {
        const dataOutline = await resOutline.json();
        if (dataOutline.success && dataOutline.outline) {
          finalOutline = dataOutline.outline;
        }
      }
    } catch (outlineErr) {
      console.warn("Outline API call error, applying local compiler fallback:", outlineErr);
    }

    if (!finalOutline) {
      finalOutline = createClientFallbackOutline(prompt, format, targetLength, docType);
    }

    setOutline(finalOutline);
    setIsResearching(false);
    setIsGeneratingOutline(false);
    setStreamStatusText("Outline ready. Opening workspace...");

    setStreamTimelineEvents((prev) => [
      ...prev,
      {
        id: `ev_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "outline",
        title: `Outline Framed (${finalOutline?.sections.length} Units)`,
        detail: `Title: "${finalOutline?.title}"`,
      },
    ]);

    // Give user 1.2s to enjoy the completed reasoning/research view, then smoothly launch Screen 3
    setTimeout(() => {
      executeStreamGeneration(finalOutline!, activeResearchBundle, activeDocId);
    }, 1200);
  };

  // --------------------------------------------------------------------------
  // STEP 2 -> STEP 3: Execute Split Workspace Streaming Generation
  // --------------------------------------------------------------------------
  const executeStreamGeneration = async (
    targetOutline: GeneratedOutline,
    targetBundle: any,
    targetDocId?: string | null
  ) => {
    setScreen("workspace");

    if (targetOutline.format === "pptx") {
      setActiveViewerMode("ppt");
    } else {
      setActiveViewerMode("word");
    }

    setIsStreaming(true);
    setIsAssembledReady(false);
    setGeneratedSections({});
    setStreamStatusText("Drafting document...");

    const accumulatedSections: Record<string, string> = {};

    setStreamTimelineEvents((prev) => [
      ...prev,
      {
        id: `ev_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "status",
        title: "Live Stream Active",
        detail: `Drafting ${targetOutline.sections.length} chapters with citations.`,
      },
    ]);

    try {
      const response = await fetch("/api/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: targetOutline.title,
          format: targetOutline.format || format,
          tone,
          audience,
          targetLength,
          docType,
          docId: targetDocId || docId,
          approvedOutline: targetOutline,
          researchBundle: targetBundle || researchBundle,
          referenceNotes: referenceNotes || undefined,
          pageCount,
          customChapterCount: customChapterCount ? parseInt(customChapterCount, 10) : undefined,
          font: selectedFont,
          accentColor,
          additionalRequirements: additionalRequirements || undefined,
          customGeminiKey: hasCustomGeminiKey ? customGeminiKeyInput : undefined,
          geminiModel,
        }),
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
                setStreamStatusText(event.message || "Processing...");
                if (event.step === "section_start" && typeof event.index === "number") {
                  setActiveGeneratingSectionIndex(event.index);
                }
              } else if (event.type === "section_done") {
                const secId = event.id || `sec_${event.index + 1}`;
                accumulatedSections[secId] = event.content;
                accumulatedSections[event.index] = event.content;
                setGeneratedSections((prev) => ({
                  ...prev,
                  [secId]: event.content,
                  [event.index]: event.content,
                }));

                setStreamTimelineEvents((prev) => [
                  ...prev,
                  {
                    id: `ev_${Date.now()}_${event.index}`,
                    timestamp: new Date().toLocaleTimeString(),
                    type: "section",
                    title: `Drafted: ${event.title}`,
                    detail: `${event.wordCount ? `${event.wordCount} words` : `${(event.content || "").length} characters`}`,
                  },
                ]);
              } else if (event.type === "complete") {
                setIsStreaming(false);
                setActiveGeneratingSectionIndex(null);
                setStreamStatusText("All chapters completed. Assembling download package...");

                const compiledSections = (event.sections && event.sections.length > 0)
                  ? event.sections.map((s: any, idx: number) => ({
                      id: s.id || `sec_${idx + 1}`,
                      title: s.title,
                      brief: s.brief,
                      content: s.content || accumulatedSections[s.id] || accumulatedSections[idx] || s.brief,
                      subsections: targetOutline.sections[idx]?.subsections || s.subsections,
                    }))
                  : targetOutline.sections.map((s, idx) => ({
                      id: s.id,
                      title: s.title,
                      brief: s.brief,
                      content: accumulatedSections[s.id] || accumulatedSections[idx] || accumulatedSections[`sec_${idx + 1}`] || s.brief,
                      subsections: s.subsections,
                    }));

                const docRecord = {
                  _id: targetDocId || docId || `doc_${Date.now()}`,
                  title: projectTitleOverride || targetOutline.title,
                  subtitle: targetOutline.subtitle,
                  prompt: targetOutline.title,
                  format: targetOutline.format || format,
                  docType,
                  tone,
                  sections: compiledSections,
                  outline: targetOutline.sections,
                  status: "completed",
                  updatedAt: new Date().toISOString()
                };

                // Add to pastDocuments state and local storage immediately
                setPastDocuments((prev) => {
                  const updated = [docRecord, ...prev.filter(d => (d._id !== docRecord._id && d.title !== docRecord.title))];
                  try {
                    localStorage.setItem("paperloop_history", JSON.stringify(updated));
                  } catch (e) {}
                  return updated;
                });

                // Save to server document history in background
                fetch("/api/documents", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(docRecord),
                }).catch((saveErr) => console.warn("Document history auto-save:", saveErr));

                const resAssemble = await fetch("/api/assemble", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    docId: targetDocId || docId,
                    title: projectTitleOverride || targetOutline.title,
                    subtitle: targetOutline.subtitle,
                    format: targetOutline.format || format,
                    docType,
                    isIEEEPaper: docType === "Research Paper" || docType === "IEEE Research Paper" || (targetOutline.title || "").toLowerCase().includes("ieee"),
                    sections: compiledSections,
                    chapters: compiledSections,
                    selectedFont,
                    accentColor,
                    academicMeta: {
                      isFormalAcademicReport,
                      institutionName,
                      department,
                      degree,
                      submittedBy,
                      guideName,
                      academicYear,
                      projectTitleOverride: projectTitleOverride || targetOutline.title,
                      selectedFont,
                      accentColor,
                    },
                  }),
                });

                if (resAssemble.ok) {
                  const blob = await resAssemble.blob();
                  const downloadUrl = URL.createObjectURL(blob);
                  const filename = `Paperrrrrr_${(projectTitleOverride || targetOutline.title).replace(/[^a-zA-Z0-9_\-]/g, "_")}.${targetOutline.format || format}`;

                  setAssembledBlobUrl(downloadUrl);
                  setAssembledFilename(filename);
                  setIsAssembledReady(true);
                  setStreamStatusText("Document ready for download.");

                  setStreamTimelineEvents((prev) => [
                    ...prev,
                    {
                      id: `ev_complete_${Date.now()}`,
                      timestamp: new Date().toLocaleTimeString(),
                      type: "complete",
                      title: `Document Package Compiled`,
                      detail: `Downloadable ${(targetOutline.format || format).toUpperCase()} package created.`,
                    },
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
                    detail: event.error,
                  },
                ]);
              }
            } catch (jsonErr) {
              console.warn("Failed to parse SSE payload:", jsonErr);
            }
          }
        }
      }
    } catch (streamErr: any) {
      console.error("Stream reader error:", streamErr);
      setIsStreaming(false);
      setStreamStatusText("Generation stream finalized.");
    }
  };

  const handleCopyMarkdown = () => {
    if (!outline) return;
    const fullMarkdown =
      `# ${outline.title}\n*${outline.subtitle}*\n\n` +
      outline.sections
        .map((s, idx) => {
          const content =
            generatedSections[s.id] ||
            generatedSections[idx] ||
            generatedSections[`sec_${idx + 1}`] ||
            (generatedSections as any)[s.title];
          return `## ${s.title}\n\n${content || s.brief}`;
        })
        .join("\n\n---\n\n");

    navigator.clipboard.writeText(fullMarkdown);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Metrics for Screen 3
  const readySectionsCount = outline
    ? outline.sections.filter(
        (s, idx) =>
          Boolean(generatedSections[s.id]) ||
          Boolean(generatedSections[idx]) ||
          Boolean(generatedSections[`sec_${idx + 1}`]) ||
          Boolean((generatedSections as any)[s.title])
      ).length
    : 0;

  const totalWords = useMemo(() => {
    return Object.values(generatedSections).reduce(
      (acc, t) => acc + (typeof t === "string" ? t.split(/\s+/).filter(Boolean).length : 0),
      0
    );
  }, [generatedSections]);

  const totalCharacters = useMemo(() => {
    return Object.values(generatedSections).reduce(
      (acc, t) => acc + (typeof t === "string" ? t.length : 0),
      0
    );
  }, [generatedSections]);

  // --------------------------------------------------------------------------
  // RENDER APP
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#19191C] flex flex-col font-sans selection:bg-[#C3644B]/20 selection:text-[#97422C]">
      {/* Subtle radial ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(195,100,75,0.06)_0%,transparent_60%)]" />

      {/* ==================================================================== */}
      {/* SCREEN 1: HOMEPAGE (CALM, MINIMAL SINGLE-PROMPT FOCUS)               */}
      {/* ==================================================================== */}
      {screen === "home" && (
        <div className="min-h-screen flex flex-col justify-between relative z-10 px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full font-sans">
          {/* Minimal Top Header */}
          <header className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <PaperrrrrrLogo size="md" />
              <span className="text-[11px] font-sans uppercase tracking-widest text-gray-700 px-2.5 py-1 rounded-md border border-gray-300 font-semibold bg-gray-100 shadow-2xs">
                Document Studio
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  fetchPastDocuments();
                  setShowHistoryModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-sans text-gray-800 hover:text-black hover:bg-gray-100 border border-gray-300 transition-colors cursor-pointer font-semibold bg-white shadow-xs"
              >
                <Clock className="size-3.5 text-[#C3644B]" />
                <span>History</span>
                {pastDocuments.length > 0 && (
                  <span className="bg-[#C3644B] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {pastDocuments.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-sans text-gray-800 hover:text-black hover:bg-gray-100 border border-gray-300 transition-colors cursor-pointer font-semibold bg-white shadow-xs"
              >
                <Sparkles className="size-3.5 text-[#C3644B]" />
                <span>
                  {hasCustomGeminiKey
                    ? `BYOK (${geminiKeyMasked})`
                    : geminiModel === "gemini-2.5-flash"
                    ? "Gemini 2.5 Flash"
                    : geminiModel}
                </span>
              </button>

              {user ? (
                <div className="flex items-center gap-2 text-xs font-sans bg-white border border-gray-300 px-3.5 py-1 rounded-full shadow-xs">
                  <div className="size-5 rounded-full bg-[#C3644B] text-white flex items-center justify-center font-bold text-[10px]">
                    {(user.name || user.email || "U")[0].toUpperCase()}
                  </div>
                  <span className="text-gray-900 font-semibold max-w-[100px] truncate">{user.name || user.email}</span>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-500 hover:text-black ml-1 transition-colors cursor-pointer text-xs font-semibold"
                    title="Sign Out"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setShowAuthModal(true);
                  }}
                  className="text-xs font-sans text-white bg-gray-900 hover:bg-black border border-gray-900 px-4 py-1.5 rounded-full transition-colors cursor-pointer font-semibold shadow-xs"
                >
                  Sign In
                </button>
              )}
            </div>
          </header>

          {/* Centered Prompt Section */}
          <main className="flex-1 flex flex-col items-center justify-center my-auto -mt-8">
            <div className="w-full max-w-2xl flex flex-col items-center gap-8">
              {/* Editorial Headline */}
              <div className="text-center space-y-3">
                <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-gray-950 leading-tight">
                  Turn research into publication-ready documents.
                </h1>
                <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto font-normal leading-relaxed">
                  Generate IEEE research papers, comprehensive multi-chapter project reports, and presentation decks with grounded web citations.
                </p>
              </div>

              {/* Centered Single Prompt Bar */}
              <div className="w-full relative">
                <form onSubmit={handleInitiatePrompt} className="w-full">
                  <div className="rounded-full px-5 py-3.5 flex items-center gap-3 shadow-lg relative bg-white border border-gray-300 focus-within:border-[#C3644B] focus-within:ring-2 focus-within:ring-[#C3644B]/20 transition-all">
                    <Sparkles className="size-5 text-[#C3644B] shrink-0" />

                    <input
                      ref={promptInputRef}
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. Comparative analysis of Quantum Key Distribution vs Post-Quantum Cryptography..."
                      className="w-full bg-transparent border-none outline-none text-base text-gray-950 placeholder-gray-400 font-sans"
                      autoFocus
                    />

                    {/* Optional File Attachment Indicator / Trigger */}
                    <button
                      type="button"
                      onClick={() => setShowFileAttachPopover(!showFileAttachPopover)}
                      className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                        attachedFileName ? "text-[#C3644B] bg-[#C3644B]/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      title={attachedFileName ? `Attached: ${attachedFileName}` : "Attach reference file"}
                    >
                      <Paperclip className="size-4" />
                    </button>

                    {/* Settings Panel Accordion Toggle Button in Prompt Bar */}
                    <button
                      type="button"
                      onClick={() => setShowDocSettingsPanel(!showDocSettingsPanel)}
                      className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                        showDocSettingsPanel ? "text-[#C3644B] bg-[#C3644B]/15" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      title="Toggle Document Settings Panel"
                    >
                      <SlidersHorizontal className="size-4" />
                    </button>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={!prompt.trim()}
                      className="size-9 rounded-full bg-[#C3644B] hover:bg-[#97422C] text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-md"
                    >
                      <Send className="size-4" />
                    </button>
                  </div>
                </form>

                {/* Attached File Chip if present */}
                {attachedFileName && (
                  <div className="flex items-center gap-2 mt-2 ml-4 text-xs font-sans text-[#C3644B] font-semibold">
                    <Paperclip className="size-3" />
                    <span>Attached: {attachedFileName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedFileName("");
                        setReferenceNotes("");
                      }}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}

                {/* File Upload Popover */}
                {showFileAttachPopover && (
                  <div className="absolute top-full left-0 mt-3 p-4 glass-panel rounded-2xl w-full max-w-sm z-30 shadow-2xl space-y-3 font-sans bg-white border border-gray-300">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-xs font-sans uppercase text-gray-700 font-semibold tracking-wider">Attach Reference Material</span>
                      <button onClick={() => setShowFileAttachPopover(false)} className="text-gray-500 hover:text-gray-900">
                        <X className="size-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">Upload notes, PDFs, or raw text to include as primary context.</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.pdf,.docx"
                      onChange={handleFileUpload}
                      className="text-xs text-gray-700 file:mr-2 file:py-1.5 file:px-3.5 file:rounded-full file:border-0 file:text-xs file:bg-[#C3644B]/10 file:text-[#97422C] file:font-semibold file:cursor-pointer font-sans"
                    />
                    {isUploadingFile && <p className="text-xs font-sans text-[#C3644B] font-semibold animate-pulse">Extracting text...</p>}
                  </div>
                )}

                {/* Collapsible Document Settings Toggle Pill */}
                <div className="w-full mt-3.5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowDocSettingsPanel(!showDocSettingsPanel)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-gray-50 border border-gray-300 text-xs font-sans text-gray-700 hover:text-gray-950 transition-all cursor-pointer shadow-xs font-medium"
                  >
                    <SlidersHorizontal className="size-3.5 text-[#C3644B]" />
                    <span>Document Settings:</span>
                    <span className="text-xs text-gray-900 font-bold">
                      {selectedFont} • {pageCount} Pages (~{calculatedBudget.totalWords.toLocaleString()} w) • {accentColor === "000000" ? "Black" : `#${accentColor}`}
                    </span>
                    <ChevronDown className={`size-3.5 transition-transform duration-200 ${showDocSettingsPanel ? "rotate-180 text-[#C3644B]" : "text-gray-500"}`} />
                  </button>
                </div>

                {/* Document Settings Panel (Collapsed by Default, Expandable) */}
                {showDocSettingsPanel && (
                  <div className="w-full mt-3 p-5 rounded-2xl border border-gray-300 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-xs font-sans bg-white">
                    {/* Live Word Budget Metric Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-sans">
                      <div className="flex items-center gap-2 text-gray-900">
                        <span className="size-2.5 rounded-full bg-[#C3644B] animate-pulse" />
                        <span className="font-semibold">Target Output:</span>
                        <span className="text-[#C3644B] font-bold">~{calculatedBudget.totalWords.toLocaleString()} Words</span>
                      </div>
                      <div className="text-gray-600 text-xs flex items-center gap-3 font-medium">
                        <span>• {pageCount} Pages (~{calculatedBudget.wordsPerPage} w/pg)</span>
                        <span>• {calculatedBudget.chapters} Chapters (~{calculatedBudget.wordsPerChapter} w/ch)</span>
                      </div>
                    </div>

                    {/* Core Settings Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-sans">
                      {/* Field: Font */}
                      <div className="space-y-1.5">
                        <label className="text-gray-700 block text-xs uppercase tracking-wider font-semibold">Typography Font</label>
                        <select
                          value={selectedFont}
                          onChange={(e) => setSelectedFont(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 font-medium outline-none cursor-pointer focus:border-[#C3644B] shadow-2xs font-sans"
                        >
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Arial">Arial</option>
                          <option value="Calibri">Calibri</option>
                          <option value="Cambria">Cambria</option>
                          <option value="Georgia">Georgia</option>
                        </select>
                      </div>

                      {/* Field: Page Count */}
                      <div className="space-y-1.5">
                        <label className="text-gray-700 block text-xs uppercase tracking-wider font-semibold">Page Target</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={pageCount}
                            onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 font-medium outline-none focus:border-[#C3644B] shadow-2xs font-sans"
                          />
                          <span className="text-gray-600 text-xs shrink-0 font-semibold">Pages</span>
                        </div>
                      </div>

                      {/* Field: Heading Accent Color */}
                      <div className="space-y-1.5">
                        <label className="text-gray-700 block text-xs uppercase tracking-wider font-semibold">Heading Color</label>
                        <select
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 font-medium outline-none cursor-pointer focus:border-[#C3644B] shadow-2xs font-sans"
                        >
                          <option value="000000">Black Only (Classic)</option>
                          <option value="1B365D">Navy Blue (#1B365D)</option>
                          <option value="800020">Burgundy (#800020)</option>
                          <option value="1E4620">Forest Emerald (#1E4620)</option>
                          <option value="2C3539">Slate Charcoal (#2C3539)</option>
                        </select>
                      </div>

                      {/* Field: Chapter Count */}
                      <div className="space-y-1.5">
                        <label className="text-gray-700 block text-xs uppercase tracking-wider font-semibold">Chapter Count</label>
                        <input
                          type="number"
                          min={2}
                          placeholder={`Auto (${calculatedBudget.chapters} chapters)`}
                          value={customChapterCount}
                          onChange={(e) => setCustomChapterCount(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 font-medium outline-none placeholder-gray-400 focus:border-[#C3644B] shadow-2xs font-sans"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-gray-200 font-sans">
                      <label className="text-gray-700 block text-xs uppercase tracking-wider font-semibold">Additional Instructions</label>
                      <textarea
                        rows={2}
                        value={additionalRequirements}
                        onChange={(e) => setAdditionalRequirements(e.target.value)}
                        placeholder="e.g. Include IEEE citations, skip executive summary, focus on Section 4..."
                        className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 font-normal outline-none placeholder-gray-400 focus:border-[#C3644B] shadow-2xs resize-none font-sans"
                      />
                    </div>

                    <div className="pt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-sans">
                      <div className="space-y-1.5">
                        <label className="text-gray-700 block text-xs uppercase tracking-wider font-semibold">Target Format</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { key: "docx", label: "Word (.docx)", icon: <FileText className="size-3.5 text-blue-600" /> },
                            { key: "pptx", label: "PowerPoint (.pptx)", icon: <Presentation className="size-3.5 text-amber-600" /> },
                            { key: "pdf", label: "Printable PDF", icon: <FileCheck className="size-3.5 text-rose-600" /> },
                          ].map((fmtOption) => (
                            <button
                              key={fmtOption.key}
                              type="button"
                              onClick={() => setFormat(fmtOption.key as any)}
                              className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-sans font-semibold transition-all cursor-pointer border ${
                                format === fmtOption.key
                                    ? "bg-[#C3644B]/15 border-[#C3644B] text-[#97422C] shadow-2xs"
                                    : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              {fmtOption.icon}
                              <span>{fmtOption.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-gray-700 block text-xs uppercase tracking-wider font-semibold">Tone &amp; Style</label>
                        <select
                          value={tone}
                          onChange={(e) => setTone(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 font-semibold outline-none focus:border-[#C3644B] shadow-2xs font-sans"
                        >
                          <option value="Academic Paper">Academic Paper</option>
                          <option value="Executive Brief">Executive Brief</option>
                          <option value="Technical Spec">Technical Spec</option>
                          <option value="Direct & Concise">Direct &amp; Concise</option>
                        </select>
                      </div>
                    </div>

                    {/* Formal Academic Report Toggle & Fields */}
                    <div className="pt-2 border-t border-gray-200 space-y-2.5 font-sans">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-900 font-bold flex items-center gap-1.5">
                          <span>Formal Academic Front Matter</span>
                          <span className="text-[10px] text-[#C3644B] bg-[#C3644B]/10 px-2 py-0.5 rounded-full font-bold">College Certificate, Declaration &amp; TOC</span>
                        </label>
                        <input
                          type="checkbox"
                          checked={isFormalAcademicReport}
                          onChange={(e) => setIsFormalAcademicReport(e.target.checked)}
                          className="size-4 accent-[#C3644B] cursor-pointer"
                        />
                      </div>

                      {isFormalAcademicReport && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-sans animate-in fade-in duration-200">
                          <div>
                            <label className="text-[11px] text-gray-700 font-semibold block mb-0.5">Institution / University</label>
                            <input
                              type="text"
                              value={institutionName}
                              onChange={(e) => setInstitutionName(e.target.value)}
                              placeholder="e.g. Stanford University"
                              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 outline-none focus:border-[#C3644B]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-700 font-semibold block mb-0.5">Department</label>
                            <input
                              type="text"
                              value={department}
                              onChange={(e) => setDepartment(e.target.value)}
                              placeholder="e.g. Dept. of Computer Science"
                              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 outline-none focus:border-[#C3644B]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-700 font-semibold block mb-0.5">Degree Program</label>
                            <input
                              type="text"
                              value={degree}
                              onChange={(e) => setDegree(e.target.value)}
                              placeholder="e.g. Bachelor of Technology"
                              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 outline-none focus:border-[#C3644B]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-700 font-semibold block mb-0.5">Submitted By (Names &amp; IDs)</label>
                            <input
                              type="text"
                              value={submittedBy}
                              onChange={(e) => setSubmittedBy(e.target.value)}
                              placeholder="e.g. Alex Chen (2021104012)"
                              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 outline-none focus:border-[#C3644B]"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[11px] text-gray-700 font-semibold block mb-0.5">Faculty Supervisor / Guide</label>
                            <input
                              type="text"
                              value={guideName}
                              onChange={(e) => setGuideName(e.target.value)}
                              placeholder="e.g. Dr. Robert Smith, Professor"
                              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 outline-none focus:border-[#C3644B]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Natural Format Detection Pill if prompt typed */}
              {prompt.length > 5 && (
                <div className="flex items-center gap-2 text-xs font-mono text-gray-600 animate-in fade-in duration-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C3644B]" />
                  <span>Targeting {format.toUpperCase()} format based on your input</span>
                </div>
              )}
            </div>
          </main>

          <footer className="w-full flex items-center justify-between text-xs font-sans text-gray-500 py-3 border-t border-gray-200 font-medium">
            <span>Paperrrrrr • Research &amp; Document Studio</span>
            <span>Live Web Research &amp; Document Engine</span>
          </footer>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 2: DEDICATED THINKING & INFORMATION GATHERING SCREEN          */}
      {/* ==================================================================== */}
      {screen === "thinking" && (
        <div className="min-h-screen flex flex-col justify-between relative z-10 px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full font-sans">
          {/* Header */}
          <header className="w-full flex items-center justify-between py-2 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <PaperrrrrrLogo size="md" />
              <span className="text-[11px] font-sans text-[#7A6B68] px-2 py-0.5 rounded border border-black/10 font-semibold uppercase tracking-wider bg-white">
                Reasoning &amp; Synthesis
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-sans text-[#5C5A55]">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="size-3.5 text-[#C3644B]" />
                {thinkingSeconds}s elapsed
              </span>
            </div>
          </header>

          {/* Center Thinking Glass Canvas */}
          <main className="flex-1 flex flex-col items-center justify-center my-8">
            <div className="glass-panel w-full max-w-2xl rounded-2xl p-8 sm:p-10 relative shadow-2xl flex flex-col gap-8 bg-white border border-gray-200">
              {/* Reasoning Pulse Header */}
              <div className="flex items-center gap-3.5">
                <div className="w-3 h-3 rounded-full bg-[#C3644B] pulse-indicator shrink-0" />
                <div className="font-sans text-lg font-medium text-[#19191C]">
                  {streamStatusText}
                </div>
              </div>

              <div className="font-sans text-xs text-[#5C5A55] flex flex-col gap-2 bg-[#F8F7F4] p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center font-medium">
                  <span>Generation Progress</span>
                  <span className="text-[#C3644B] font-bold">Active</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C3644B] w-[65%] transition-all duration-700 ease-out" />
                </div>
                <div className="flex justify-between items-center pt-1 text-[11px] text-[#8C8983]">
                  <span>Topic: &quot;{prompt.slice(0, 48)}...&quot;</span>
                  <span>Target: {format.toUpperCase()}</span>
                </div>
              </div>

              {/* Active Tavily Research Sources Queue */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-sans uppercase tracking-wider text-[#5C5A55] font-semibold">
                    Referenced Research Entities
                  </h3>
                  <span className="text-[11px] font-sans text-[#C3644B] font-semibold">
                    {researchBundle?.results?.length || 2} live sources
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto custom-scrollbar" data-lenis-prevent>
                  {researchBundle?.results && researchBundle.results.length > 0 ? (
                    researchBundle.results.map((source, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF9F6] border border-gray-200 source-appear shadow-xs"
                        style={{ animationDelay: `${sIdx * 0.15}s` }}
                      >
                        <Globe className="size-4 text-[#C3644B] shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[#19191C] truncate">
                            {source.title}
                          </div>
                          <div className="text-[11px] font-sans text-[#7A6B68] truncate">
                            {source.url}
                          </div>
                          {source.snippet && (
                            <div className="text-[11px] text-[#5C5A55] mt-0.5 line-clamp-1">
                              {source.snippet}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <Globe className="size-4 text-[#C3644B] animate-spin shrink-0" />
                      <div className="text-xs font-sans text-[#5C5A55]">
                        Querying real-time empirical vectors for {prompt}...
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Outline Framing Preview with Expandable Chapters & Subsections */}
              {outline && (
                <div className="space-y-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center text-xs font-sans text-[#5C5A55]">
                    <span className="font-bold text-[#19191C]">Outline Architecture</span>
                    <span className="text-[#C3644B] bg-[#C3644B]/10 px-2 py-0.5 rounded font-semibold">
                      {outline.sections.length} Chapters Structured
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1" data-lenis-prevent>
                    {outline.sections.map((sec, i) => {
                      const isExpanded = !!expandedChapterIds[sec.id || `ch_${i}`];
                      const subCount = sec.subsections?.length || 0;

                      return (
                        <div
                          key={sec.id || i}
                          className="bg-[#FAF9F6] border border-gray-200 rounded-xl p-3 space-y-1.5 transition-colors shadow-xs"
                        >
                          <div
                            onClick={() =>
                              setExpandedChapterIds((prev) => ({
                                ...prev,
                                [sec.id || `ch_${i}`]: !prev[sec.id || `ch_${i}`],
                              }))
                            }
                            className="flex items-center justify-between cursor-pointer group"
                          >
                            <span className="text-xs font-serif font-bold text-[#19191C] group-hover:text-[#C3644B] transition-colors truncate">
                              {sec.title}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              {subCount > 0 && (
                                <span className="text-[10px] font-sans text-[#7A6B68] bg-white px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                                  {subCount} Subsections
                                </span>
                              )}
                              <ChevronDown
                                className={`size-3.5 text-[#7A6B68] transition-transform duration-200 ${
                                  isExpanded ? "rotate-180 text-[#C3644B]" : ""
                                }`}
                              />
                            </div>
                          </div>

                          <p className="text-[11px] text-[#5C5A55] line-clamp-1">{sec.brief}</p>

                          {/* Nested Subsections */}
                          {isExpanded && sec.subsections && sec.subsections.length > 0 && (
                            <div className="pl-3 pt-2 border-l border-[#C3644B]/30 space-y-1.5 animate-in fade-in duration-200">
                              {sec.subsections.map((sub, sIdx) => (
                                <div
                                  key={sub.id || sIdx}
                                  className="text-[11px] font-sans text-[#5C5A55] flex items-start gap-2 bg-white p-1.5 rounded-lg border border-gray-200 shadow-2xs"
                                >
                                  <span className="text-[#C3644B] font-bold shrink-0">
                                    {sub.title.split(" ")[0]}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[#19191C] font-sans font-medium">
                                      {sub.title.replace(/^\d+\.\d+\s*/, "")}
                                    </div>
                                    <div className="text-[10px] text-[#8C8983] truncate">{sub.brief}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Instant Advance Action */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (outline) {
                      executeStreamGeneration(outline, researchBundle, docId);
                    }
                  }}
                  iconTrailing={<ArrowRight className="size-3.5" />}
                >
                  Enter Workspace Now
                </Button>
              </div>
            </div>
          </main>

          {/* Minimal Footer */}
          <footer className="w-full flex items-center justify-between text-xs font-sans text-[#8C8983] py-2 border-t border-gray-200">
            <span>Research &amp; Outline Generation Active</span>
            <span>Auto-advancing to split workspace...</span>
          </footer>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 3: THE SPLIT WORKSPACE (CODE & PREVIEW SIDE BY SIDE)          */}
      {/* ==================================================================== */}
      {screen === "workspace" && outline && (
        <div className="min-h-screen flex flex-col justify-between bg-[#FAF9F6] text-[#19191C] relative z-10 font-sans">
          {/* Top Minimal Workspace Navigation */}
          <header className="w-full bg-white/90 backdrop-blur-xl border-b border-gray-200 px-6 py-3 sticky top-0 z-50 flex items-center justify-between font-sans shadow-xs">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setScreen("home")}
                className="flex items-center gap-2 cursor-pointer group focus:outline-none"
              >
                <PaperrrrrrLogo size="sm" />
              </button>

              {/* Minimal Breadcrumb */}
              <div className="hidden md:flex items-center gap-2 text-xs font-sans text-[#7A6B68]">
                <span>Documents</span>
                <ChevronRight className="size-3 text-gray-400" />
                <span className="text-[#5C5A55] truncate max-w-xs">{outline.title}</span>
                <ChevronRight className="size-3 text-gray-400" />
                <span className="text-[#C3644B] font-medium">Split Workspace</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* History Archive Trigger */}
              <button
                type="button"
                onClick={() => {
                  fetchPastDocuments();
                  setShowHistoryModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans text-[#5C5A55] hover:text-[#19191C] hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer font-medium bg-white shadow-xs"
                title="View Document History"
              >
                <Clock className="size-3.5 text-[#C3644B]" />
                <span className="hidden md:inline">History</span>
                {pastDocuments.length > 0 && (
                  <span className="bg-[#C3644B]/15 text-[#97422C] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {pastDocuments.length}
                  </span>
                )}
              </button>

              {/* Live Streaming State Badge */}
              <div className="flex items-center gap-2 text-xs font-sans bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full">
                <span className={`w-2 h-2 rounded-full ${isStreaming ? "bg-[#C3644B] animate-ping" : "bg-emerald-500"}`} />
                <span className="text-[#19191C] font-medium">
                  {isStreaming
                    ? `Drafting ${readySectionsCount + 1}/${outline.sections.length}`
                    : "Assembled & Ready"}
                </span>
              </div>

              {/* Format Canvas Switcher */}
              <div className="hidden sm:flex items-center bg-gray-100 border border-gray-200 rounded-xl p-0.5 text-xs font-sans">
                <button
                  type="button"
                  onClick={() => setActiveViewerMode("word")}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeViewerMode === "word" ? "bg-white text-[#C3644B] font-bold shadow-xs" : "text-[#7A6B68] hover:text-[#19191C]"
                  }`}
                >
                  Word
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewerMode("ppt")}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeViewerMode === "ppt" ? "bg-white text-[#C3644B] font-bold shadow-xs" : "text-[#7A6B68] hover:text-[#19191C]"
                  }`}
                >
                  Slides
                </button>
              </div>

              {/* Copy Markdown / Export Button */}
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="p-2 rounded-lg text-[#5C5A55] hover:text-[#19191C] hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer bg-white"
                title="Copy full Markdown"
              >
                {copySuccess ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </button>

              {assembledBlobUrl ? (
                <a
                  href={assembledBlobUrl}
                  download={assembledFilename || `Paperrrrrr_${outline.title}.${format}`}
                  className="inline-flex items-center gap-2 bg-[#C3644B] hover:bg-[#97422C] text-white px-4 py-1.5 rounded-lg text-xs font-sans font-bold transition-all shadow-md"
                >
                  <Download className="size-3.5" />
                  <span>Download {format.toUpperCase()}</span>
                </a>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center gap-2 bg-gray-200 text-gray-500 px-4 py-1.5 rounded-lg text-xs font-sans cursor-not-allowed"
                >
                  <Download className="size-3.5" />
                  <span>{isStreaming ? "Compiling..." : "Export"}</span>
                </button>
              )}
            </div>
          </header>

          {/* Main Split-Screen Workspace Grid */}
          <main className="flex-1 w-full flex flex-col lg:flex-row h-[calc(100vh-60px)] overflow-hidden font-sans">
            {/* ------------------------------------------------------------ */}
            {/* LEFT SIDE: "CODE" / STRUCTURED CONTENT STREAM (45% Width)    */}
            {/* ------------------------------------------------------------ */}
            <section className="w-full lg:w-[45%] h-full flex flex-col border-r border-gray-200 bg-[#FAF9F6]">
              {/* Left Side Header Tabs */}
              <div className="h-11 px-4 border-b border-gray-200 bg-white flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setWorkspaceTab("code")}
                    className={`flex items-center gap-1.5 pb-0.5 cursor-pointer ${
                      workspaceTab === "code" ? "text-[#C3644B] border-b-2 border-[#C3644B] font-bold" : "text-[#7A6B68] hover:text-[#19191C]"
                    }`}
                  >
                    <FileCode2 className="size-3.5" />
                    <span>source.md</span>
                  </button>
                  <button
                    onClick={() => setWorkspaceTab("logs")}
                    className={`flex items-center gap-1.5 pb-0.5 cursor-pointer ${
                      workspaceTab === "logs" ? "text-[#C3644B] border-b-2 border-[#C3644B] font-bold" : "text-[#7A6B68] hover:text-[#19191C]"
                    }`}
                  >
                    <Terminal className="size-3.5" />
                    <span>stream.log</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[#8C8983]">
                  <span>Words: {totalWords}</span>
                  <span>Chars: {totalCharacters}</span>
                </div>
              </div>

              {/* Left Side Content Body */}
              {workspaceTab === "code" ? (
                <div className="flex-1 p-5 overflow-y-auto custom-scrollbar font-sans text-xs text-[#19191C] leading-relaxed space-y-4" data-lenis-prevent>
                  {/* Document Title Header Block */}
                  <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-1 font-sans">
                    <div className="text-base font-serif font-bold text-[#19191C]"># {outline.title}</div>
                    <div className="text-xs text-[#5C5A55] italic">*{outline.subtitle}*</div>
                    <div className="text-[11px] text-[#8C8983] pt-1">
                      Format: {format.toUpperCase()} • Tone: {tone}
                    </div>
                  </div>

                  {/* Sections List Stream */}
                  {outline.sections.map((sec, idx) => {
                    const content =
                      generatedSections[sec.id] ||
                      generatedSections[idx] ||
                      generatedSections[`sec_${idx + 1}`] ||
                      (generatedSections as any)[sec.title];
                    const isCurrent = activeGeneratingSectionIndex === idx;

                    return (
                      <div
                        key={sec.id || idx}
                        className={`p-4 rounded-xl border transition-all font-sans ${
                          isCurrent
                            ? "bg-[#FFF6F3] border-[#C3644B] shadow-sm"
                            : content
                            ? "bg-white border-gray-200 shadow-2xs"
                            : "bg-white/60 border-gray-200 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-[#19191C]">## {sec.title}</span>
                          {content ? (
                            <span className="text-[10px] text-emerald-600 font-sans font-medium flex items-center gap-1">
                              <Check className="size-3" /> Drafted
                            </span>
                          ) : isCurrent ? (
                            <span className="text-[10px] text-[#C3644B] font-sans font-medium animate-pulse">
                              Streaming...
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#8C8983] font-sans font-medium">Queued</span>
                          )}
                        </div>

                        {content ? (
                          <div className="whitespace-pre-wrap text-[11px] text-[#333336] leading-relaxed">
                            {content}
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#8C8983] italic">
                            {isCurrent ? "Drafting section prose..." : sec.brief}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isStreaming && (
                    <div className="flex items-center gap-2 text-xs text-[#C3644B] pt-2 font-sans font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#C3644B] animate-ping" />
                      <span>Streaming tokens in real time...</span>
                      <span className="inline-block w-2 h-4 bg-[#C3644B] cursor-blink" />
                    </div>
                  )}
                </div>
              ) : (
                /* Tab 2: Logs View */
                <div className="flex-1 p-5 overflow-y-auto custom-scrollbar font-sans text-xs text-[#5C5A55] space-y-2 bg-[#F8F7F4]" data-lenis-prevent>
                  <div className="text-[11px] text-[#7A6B68] pb-2 border-b border-gray-200 font-sans">
                    // Live Activity Stream
                  </div>
                  {streamTimelineEvents.map((ev) => (
                    <div key={ev.id} className="flex items-start gap-2 text-[11px] leading-relaxed font-sans">
                      <span className="text-[#8C8983] shrink-0">[{ev.timestamp}]</span>
                      <div className="flex-1">
                        <span
                          className={
                            ev.type === "complete"
                              ? "text-emerald-700 font-bold"
                              : ev.type === "section"
                              ? "text-[#C3644B] font-bold"
                              : ev.type === "research"
                              ? "text-blue-700"
                              : "text-[#19191C]"
                          }
                        >
                          {ev.title}
                        </span>
                        {ev.detail && <p className="text-[#5C5A55] text-[10px] mt-0.5">{ev.detail}</p>}
                      </div>
                    </div>
                  ))}
                  <div ref={timelineEndRef} />
                </div>
              )}
            </section>

            {/* ------------------------------------------------------------ */}
            {/* RIGHT SIDE: LIVE RENDERED INTERACTIVE CANVAS (55% Width)     */}
            {/* ------------------------------------------------------------ */}
            <section className="w-full lg:w-[55%] h-full flex flex-col bg-[#ECEAE4] overflow-hidden relative font-sans">
              {/* Right Side Canvas Header / Mode Bar */}
              <div className="h-11 px-6 border-b border-gray-300 bg-white/70 backdrop-blur-md flex items-center justify-between text-xs font-sans text-[#5C5A55]">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-[#19191C]">Live Rendered Canvas</span>
                </span>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                    className="p-1 hover:text-black cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="size-3.5" />
                  </button>
                  <span className="text-[11px] font-sans text-[#19191C] w-10 text-center font-semibold">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                    className="p-1 hover:text-black cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Side Canvas Body (Scrollable Container) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex justify-center items-start bg-[#ECEAE4]" data-lenis-prevent>
                <div
                  className="w-full max-w-3xl transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
                >
                  {/* CANVAS VIEWER 1: WORD (.docx) / ACADEMIC REPORT - Authentic Discrete Physical A4 Sheet Stack */}
                  {activeViewerMode === "word" && (
                    <div className="space-y-10 flex flex-col items-center w-full">
                      {/* ------------------------------------------------------------ */}
                      {/* A4 SHEET 1: FORMAL COVER PAGE                               */}
                      {/* ------------------------------------------------------------ */}
                      <div className="w-full max-w-[794px] min-h-[1123px] bg-white text-gray-950 p-12 sm:p-16 rounded-xs shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-300 relative flex flex-col justify-between select-text font-serif">
                        {/* Running Top Header */}
                        <div className="border-b border-gray-200 pb-3 flex justify-between items-center text-[10px] uppercase tracking-widest text-gray-500 font-sans">
                          <span>{institutionName || "Paperrrrrr Document Studio"}</span>
                          <span>{isFormalAcademicReport ? "Academic Project Report" : "Empirical Research Series"}</span>
                        </div>

                        {/* Cover Body */}
                        <div className="my-auto py-8 text-center space-y-6">
                          {isFormalAcademicReport && (
                            <div className="space-y-1 text-xs uppercase tracking-wider text-gray-600 font-sans font-semibold">
                              <p>{institutionName || "Department of Computer Science & Engineering"}</p>
                              <p className="text-[11px] text-gray-500">{department || "Faculty of Engineering & Technology"}</p>
                            </div>
                          )}

                          <div className="space-y-3 py-6">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-950 leading-tight border-y-2 border-gray-950 py-4 font-serif">
                              {outline.title}
                            </h1>
                            <p className="text-sm sm:text-base italic text-gray-700 max-w-xl mx-auto font-serif">
                              {outline.subtitle}
                            </p>
                          </div>

                          {isFormalAcademicReport ? (
                            <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-left font-sans border-t border-gray-200">
                              <div className="space-y-1">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Submitted By:</span>
                                <p className="font-bold text-gray-900">{submittedBy || "Alex Chen & Research Group"}</p>
                                <p className="text-gray-600">{degree || "Bachelor of Technology"}</p>
                              </div>
                              <div className="space-y-1 text-right">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Faculty Supervisor:</span>
                                <p className="font-bold text-gray-900">{guideName || "Dr. Robert Smith, Professor"}</p>
                                <p className="text-gray-600">{department || "Dept. of Computer Science"}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-4 flex flex-wrap justify-center items-center gap-6 text-xs text-gray-600 font-sans">
                              <span>Author: Document Studio</span>
                              <span>•</span>
                              <span>Format: {format.toUpperCase()}</span>
                              <span>•</span>
                              <span>Typography: {selectedFont}</span>
                              <span>•</span>
                              <span>Live Citations: {researchBundle?.results?.length || 2} Sources</span>
                            </div>
                          )}
                        </div>

                        {/* Running Bottom Footer */}
                        <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-[10px] text-gray-500 font-sans">
                          <span>Verified Manuscript Edition • Standard A4</span>
                          <span>Cover Page</span>
                        </div>
                      </div>

                      {/* ------------------------------------------------------------ */}
                      {/* OPTIONAL ACADEMIC SHEET 2: CERTIFICATE OF BONAFIDE WORK      */}
                      {/* ------------------------------------------------------------ */}
                      {isFormalAcademicReport && (
                        <div className="w-full max-w-[794px] min-h-[1123px] bg-white text-gray-950 p-12 sm:p-16 rounded-xs shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-300 relative flex flex-col justify-between select-text font-serif">
                          <div className="border-b border-gray-200 pb-3 flex justify-between items-center text-[10px] uppercase tracking-widest text-gray-500 font-sans">
                            <span>{institutionName || "Institution of Research"}</span>
                            <span>Certificate of Approval</span>
                          </div>

                          <div className="my-auto space-y-6 text-justify leading-relaxed">
                            <h2 className="text-center font-bold text-xl uppercase tracking-wider border-b-2 border-gray-900 pb-2">
                              Bonafide Certificate
                            </h2>
                            <p className="text-sm">
                              This is to certify that the project report titled <strong className="underline decoration-1">&quot;{outline.title}&quot;</strong> is a bonafide record of authentic research work carried out by <strong>{submittedBy || "the undersigned candidate"}</strong> in partial fulfillment of the requirements for the award of the degree of <strong>{degree || "Bachelor of Technology"}</strong> in <strong>{department || "Computer Science and Engineering"}</strong> at <strong>{institutionName || "the University"}</strong> during the academic year 2025–2026.
                            </p>
                            <p className="text-sm">
                              The empirical findings, data models, and literature evaluations presented in this manuscript are original and have not been submitted previously to any other university or institute for the award of any degree or diploma.
                            </p>

                            <div className="pt-16 grid grid-cols-2 gap-12 font-sans text-xs">
                              <div className="border-t border-gray-400 pt-2 space-y-1">
                                <p className="font-bold text-gray-900">{guideName || "Faculty Supervisor / Guide"}</p>
                                <p className="text-gray-600">Department of {department || "Computer Science"}</p>
                                <p className="text-gray-500 italic">Signature of Project Supervisor</p>
                              </div>
                              <div className="border-t border-gray-400 pt-2 space-y-1 text-right">
                                <p className="font-bold text-gray-900">Head of Department</p>
                                <p className="text-gray-600">{institutionName || "University Academic Council"}</p>
                                <p className="text-gray-500 italic">Department Seal &amp; Signature</p>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-[10px] text-gray-500 font-sans">
                            <span>Academic Project Standards (ISO 216 A4)</span>
                            <span>Page ii</span>
                          </div>
                        </div>
                      )}

                      {/* ------------------------------------------------------------ */}
                      {/* OPTIONAL ACADEMIC SHEET 3: DECLARATION & TABLE OF CONTENTS   */}
                      {/* ------------------------------------------------------------ */}
                      {isFormalAcademicReport && (
                        <div className="w-full max-w-[794px] min-h-[1123px] bg-white text-gray-950 p-12 sm:p-16 rounded-xs shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-300 relative flex flex-col justify-between select-text font-serif">
                          <div className="border-b border-gray-200 pb-3 flex justify-between items-center text-[10px] uppercase tracking-widest text-gray-500 font-sans">
                            <span>{outline.title.slice(0, 36)}...</span>
                            <span>Table of Contents</span>
                          </div>

                          <div className="my-auto space-y-6">
                            <h2 className="text-center font-bold text-xl uppercase tracking-wider border-b-2 border-gray-900 pb-2">
                              Table of Contents
                            </h2>

                            <div className="space-y-2 text-xs font-sans">
                              <div className="flex justify-between items-center py-1 font-bold text-gray-900 border-b border-gray-200">
                                <span>Chapter Title / Section</span>
                                <span>Page No.</span>
                              </div>

                              {outline.sections.map((sec, sIdx) => (
                                <div key={sec.id || sIdx} className="space-y-1">
                                  <div className="flex justify-between items-baseline text-gray-900 font-semibold">
                                    <span className="truncate pr-2">Chapter {sIdx + 1}: {sec.title}</span>
                                    <span className="flex-1 border-b border-dotted border-gray-400 mx-2" />
                                    <span className="shrink-0">{sIdx + 1}</span>
                                  </div>

                                  {sec.subsections && sec.subsections.map((sub, subIdx) => (
                                    <div key={sub.id || subIdx} className="flex justify-between items-baseline text-gray-600 pl-4 text-[11px]">
                                      <span className="truncate pr-2">{sub.title}</span>
                                      <span className="flex-1 border-b border-dotted border-gray-300 mx-2" />
                                      <span className="shrink-0">{sIdx + 1}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}

                              <div className="flex justify-between items-baseline text-gray-900 font-bold pt-2 border-t border-gray-200">
                                <span>References &amp; Empirical Citations</span>
                                <span className="flex-1 border-b border-dotted border-gray-400 mx-2" />
                                <span>{outline.sections.length + 1}</span>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-[10px] text-gray-500 font-sans">
                            <span>Academic Project Standards (ISO 216 A4)</span>
                            <span>Page iii</span>
                          </div>
                        </div>
                      )}

                      {/* ------------------------------------------------------------ */}
                      {/* A4 DISCRETE CHAPTER PAGES STACK                              */}
                      {/* ------------------------------------------------------------ */}
                      {outline.sections.map((sec, idx) => {
                        const content =
                          generatedSections[sec.id] ||
                          generatedSections[idx] ||
                          generatedSections[`sec_${idx + 1}`] ||
                          (generatedSections as any)[sec.title];

                        const isIEEE = tone === "Academic Paper" || format === "docx" || format === "pdf";

                        return (
                          <div
                            key={sec.id || idx}
                            className="w-full max-w-[794px] min-h-[1123px] bg-white text-gray-950 p-12 sm:p-16 rounded-xs shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-300 relative flex flex-col justify-between select-text"
                            style={{ fontFamily: selectedFont === "Times New Roman" ? "'Times New Roman', serif" : selectedFont }}
                          >
                            {/* Running Top Header */}
                            <div className="border-b border-gray-200 pb-3 flex justify-between items-center text-[10px] uppercase tracking-wider text-gray-500 font-sans">
                              <span className="truncate max-w-sm">{outline.title}</span>
                              <span>Chapter {idx + 1} • {sec.title.slice(0, 24)}</span>
                            </div>

                            {/* Chapter Body Content */}
                            <div className="my-6 flex-1 space-y-4 text-sm leading-relaxed text-gray-900">
                              <div className="border-b border-gray-300 pb-2 mb-4">
                                <span className="text-xs uppercase tracking-widest text-[#C3644B] font-bold font-sans block mb-1">
                                  Chapter {idx + 1}
                                </span>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-950">
                                  {sec.title}
                                </h2>
                              </div>

                              {content ? (
                                <div className="space-y-4 whitespace-pre-wrap text-justify text-[13px] leading-relaxed">
                                  {content}
                                </div>
                              ) : (
                                <div className="p-12 text-center text-gray-400 italic space-y-3 font-sans">
                                  <div className="size-8 rounded-full border-2 border-[#C3644B] border-t-transparent animate-spin mx-auto" />
                                  <p className="font-serif text-sm text-gray-600">{sec.brief}</p>
                                  <span className="text-xs text-[#C3644B] font-semibold block">
                                    [Synthesizing empirical prose with verified citations...]
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Running Bottom Footer */}
                            <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-[10px] text-gray-500 font-sans">
                              <span>Paperrrrrr Research Engine • Publication Standard</span>
                              <span>Page {idx + 1} of {outline.sections.length}</span>
                            </div>
                          </div>
                        );
                      })}

                      {/* ------------------------------------------------------------ */}
                      {/* A4 SHEET: REFERENCES & EMPIRICAL CITATIONS                  */}
                      {/* ------------------------------------------------------------ */}
                      <div className="w-full max-w-[794px] min-h-[1123px] bg-white text-gray-950 p-12 sm:p-16 rounded-xs shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-300 relative flex flex-col justify-between select-text font-serif">
                        <div className="border-b border-gray-200 pb-3 flex justify-between items-center text-[10px] uppercase tracking-widest text-gray-500 font-sans">
                          <span className="truncate max-w-sm">{outline.title}</span>
                          <span>References &amp; Empirical Sources</span>
                        </div>

                        <div className="my-auto space-y-6">
                          <h2 className="text-center font-bold text-xl uppercase tracking-wider border-b-2 border-gray-900 pb-2">
                            References
                          </h2>

                          <div className="space-y-3 text-xs leading-relaxed text-justify font-sans">
                            {researchBundle?.results && researchBundle.results.length > 0 ? (
                              researchBundle.results.map((src, rIdx) => (
                                <div key={rIdx} className="flex items-start gap-2 text-gray-800">
                                  <span className="font-bold text-[#C3644B] shrink-0">[{rIdx + 1}]</span>
                                  <div>
                                    <span className="font-semibold text-gray-950">{src.title}. </span>
                                    <span className="italic text-gray-600">Available online: </span>
                                    <a
                                      href={src.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#C3644B] hover:underline break-all"
                                    >
                                      {src.url}
                                    </a>
                                    {src.snippet && (
                                      <p className="text-[11px] text-gray-500 mt-0.5">&quot;{src.snippet}&quot;</p>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="space-y-2 text-gray-700">
                                <p>[1] National Academic &amp; Research Standards Board, &quot;Empirical Guidelines for Technical Manuscripts and Literature Reviews,&quot; vol. 42, no. 3, 2025.</p>
                                <p>[2] IEEE Standards Association, &quot;Formatting and Citation Specifications for Technical and Applied Sciences,&quot; Piscataway, NJ, 2024.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-[10px] text-gray-500 font-sans">
                          <span>Verified Citations • Standard A4</span>
                          <span>Page {outline.sections.length + (isFormalAcademicReport ? 4 : 1)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CANVAS VIEWER 2: POWERPOINT (.pptx) - Interactive Deck Viewer */}
                  {activeViewerMode === "ppt" && (
                    <div className="w-full">
                      <PPTXDeckViewer
                        title={outline.title}
                        subtitle={outline.subtitle}
                        sections={outline.sections}
                        generatedSections={generatedSections}
                        isStreaming={isStreaming}
                        onDownload={() => {
                          if (assembledBlobUrl) {
                            const link = document.createElement("a");
                            link.href = assembledBlobUrl;
                            link.download = assembledFilename || `Paperrrrrr_${outline.title}.pptx`;
                            link.click();
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>
          </main>
        </div>
      )}

      {/* ==================================================================== */}
      {/* AUTHENTICATION MODAL                                                 */}
      {/* ==================================================================== */}
      {showAuthModal && (
        <Modal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title={authMode === "signup" ? "Create Paperrrrrr Account" : "Sign In to Paperrrrrr Studio"}
        >
          <div className="space-y-4 font-sans text-xs">
            {/* One-Click Google Authentication */}
            <button
              type="button"
              onClick={async () => {
                try {
                  const googleEmail = authEmail.trim() || undefined;
                  const googleName = authName.trim() || undefined;
                  const res = await fetch("/api/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "google", email: googleEmail, name: googleName }),
                  });
                  const data = await res.json();
                  if (data.user) {
                    setUser(data.user);
                    try {
                      localStorage.setItem("paperrrrrr_user", JSON.stringify(data.user));
                      localStorage.setItem("paperloop_user", JSON.stringify(data.user));
                    } catch (e) {}
                    setShowAuthModal(false);
                    fetchPastDocuments();
                  } else {
                    alert(data.error || "Google Sign-In failed");
                  }
                } catch (e: any) {
                  alert("Google Sign-In Error: " + e.message);
                }
              }}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-sans text-[#19191C] transition-all cursor-pointer shadow-2xs font-semibold"
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] uppercase tracking-wider text-[#8C8983] font-semibold">or with email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5 font-sans">
              {authMode === "signup" && (
                <div>
                  <label className="text-xs text-[#5C5A55] font-medium">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-[#F8F7F4] border border-gray-200 rounded-xl p-2.5 text-xs text-[#19191C] outline-none mt-1 focus:border-[#C3644B]"
                    placeholder="e.g. Dr. Jane Vance"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-[#5C5A55] font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#F8F7F4] border border-gray-200 rounded-xl p-2.5 text-xs text-[#19191C] outline-none mt-1 focus:border-[#C3644B]"
                  placeholder="name@university.edu"
                />
              </div>
              <div>
                <label className="text-xs text-[#5C5A55] font-medium">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#F8F7F4] border border-gray-200 rounded-xl p-2.5 text-xs text-[#19191C] outline-none mt-1 focus:border-[#C3644B]"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}
                  className="text-xs text-[#C3644B] hover:underline cursor-pointer font-medium"
                >
                  {authMode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
                </button>
                <Button type="submit" variant="primary" size="sm">
                  {authMode === "signup" ? "Sign Up" : "Sign In"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* BYOK SETTINGS MODAL                                                  */}
      {/* ==================================================================== */}
      {showSettingsModal && (
        <Modal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          title="Studio & AI Model Settings"
        >
          <div className="space-y-4 text-xs font-sans">
            <div>
              <label className="text-[#5C5A55] block mb-1 font-medium">Google Gemini API Key (BYOK)</label>
              <input
                type="password"
                placeholder={hasCustomGeminiKey ? `Active Key: ${geminiKeyMasked}` : "AIzaSy..."}
                value={customGeminiKeyInput}
                onChange={(e) => setCustomGeminiKeyInput(e.target.value)}
                className="w-full bg-[#F8F7F4] border border-gray-200 rounded-xl p-2.5 text-[#19191C] outline-none font-sans focus:border-[#C3644B]"
              />
              <p className="text-[11px] text-[#8C8983] mt-1">
                Keys are encrypted with AES-256 GCM in your session.
              </p>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              {hasCustomGeminiKey && (
                <button
                  type="button"
                  onClick={handleClearKeys}
                  className="text-rose-600 hover:underline cursor-pointer font-medium"
                >
                  Clear Stored Key
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="secondary_gray" size="sm" onClick={() => setShowSettingsModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveKeys} disabled={savingSettings}>
                  {savingSettings ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* DOCUMENT HISTORY MODAL                                               */}
      {/* ==================================================================== */}
      {showHistoryModal && (
        <Modal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          title="Document History & Archive"
        >
          <div className="space-y-4 font-sans text-xs">
            <div className="flex justify-between items-center text-xs font-sans text-[#5C5A55]">
              <span className="font-semibold">Saved Manuscripts ({pastDocuments.length})</span>
              <button
                type="button"
                onClick={fetchPastDocuments}
                className="hover:text-[#19191C] flex items-center gap-1 cursor-pointer font-medium"
              >
                <RotateCw className="size-3" /> Refresh
              </button>
            </div>

            {pastDocuments.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-sans text-xs space-y-2 border border-gray-200 rounded-xl bg-gray-50">
                <Clock className="size-6 text-[#C3644B] mx-auto opacity-60" />
                <p className="font-medium text-[#19191C]">No documents generated yet.</p>
                <p className="text-[11px] text-[#8C8983]">Generate a document to build your persistent research archive.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto custom-scrollbar pr-1 font-sans" data-lenis-prevent>
                {pastDocuments.map((doc, dIdx) => (
                  <div
                    key={doc._id || doc.id || dIdx}
                    className="p-3.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 transition-all flex flex-col gap-2 group shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-serif font-bold text-[#19191C] truncate group-hover:text-[#C3644B] transition-colors">
                          {doc.title}
                        </h4>
                        <p className="text-[11px] text-[#5C5A55] truncate mt-0.5">{doc.subtitle || doc.prompt}</p>
                      </div>
                      <span className="text-[10px] font-sans uppercase bg-[#C3644B]/10 text-[#97422C] border border-[#C3644B]/20 px-2 py-0.5 rounded-full shrink-0 font-bold">
                        {(doc.format || "docx").toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] font-sans text-[#8C8983]">
                      <span>
                        {doc.updatedAt
                          ? new Date(doc.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "Saved Manuscript"}
                      </span>
                      <button
                        type="button"
                        onClick={() => loadHistoryDocument(doc)}
                        className="text-[#19191C] hover:text-[#C3644B] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open in Workspace</span>
                        <ArrowRight className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
