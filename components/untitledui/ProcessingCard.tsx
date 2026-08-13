import React, { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Search,
  BookOpen,
  FileCode2,
  Terminal,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  FileText,
} from "lucide-react";
import { Badge, BadgeGroup } from "./Badge";
import { ProgressBar } from "./ProgressBar";
import { Tabs } from "./Tabs";

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "pending";
  icon?: React.ReactNode;
}

interface ProcessingCardProps {
  currentStageText: string;
  modelName?: string;
  format?: string;
  typedCodeLines?: string[];
  sourcesCount?: number;
  onViewSources?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function ProcessingCard({
  currentStageText,
  modelName = "Gemini 3.6 Flash",
  format = "docx",
  typedCodeLines = [],
  sourcesCount = 8,
  onViewSources,
  onCancel,
  className = "",
}: ProcessingCardProps) {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m > 0 ? `${m}m ` : ""}${s.toString().padStart(2, "0")}s`;
  };

  // Determine dynamic pipeline steps based on typedCodeLines progress
  const linesCount = typedCodeLines.length;

  const steps: ProcessingStep[] = [
    {
      id: "search",
      title: "Real-Time Neural Web Search",
      description: "Querying Tavily multi-vector search & empirical datasets",
      status: linesCount >= 3 ? "completed" : linesCount >= 1 ? "in-progress" : "pending",
      icon: <Globe className="size-4 text-blue-500" />,
    },
    {
      id: "ast",
      title: "AST Taxonomy & Grammar Synthesis",
      description: "Formulating 12 exhaustive chapters and heading structures",
      status: linesCount >= 6 ? "completed" : linesCount >= 3 ? "in-progress" : "pending",
      icon: <Layers className="size-4 text-purple-500" />,
    },
    {
      id: "citation",
      title: "Citation & Plagiarism Verification",
      description: "Anchoring institutional citations & academic CAGR statistics",
      status: linesCount >= 8 ? "completed" : linesCount >= 6 ? "in-progress" : "pending",
      icon: <ShieldCheck className="size-4 text-emerald-500" />,
    },
    {
      id: "compiler",
      title: "OpenXML & PDF Binary Compilation",
      description: "Preparing live Server-Sent Events prose streaming pipeline",
      status: linesCount >= 9 ? "completed" : linesCount >= 8 ? "in-progress" : "pending",
      icon: <FileText className="size-4 text-[#7F56D9]" />,
    },
  ];

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progressPercent = Math.min(95, Math.max(15, (linesCount / 9) * 100));

  return (
    <div
      className={`w-full max-w-3xl mx-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden backdrop-blur-md flex flex-col ${className}`}
    >
      {/* Top Banner with Untitled UI Badge & Timer */}
      <div className="p-6 sm:p-7 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center size-12">
              <span className="absolute size-full rounded-full bg-[#7F56D9]/25 dark:bg-[#9E77ED]/25 animate-ping opacity-75" />
              <span className="absolute size-10 rounded-full bg-[#7F56D9]/15 dark:bg-[#9E77ED]/20 animate-pulse" />
              <div className="relative flex size-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#7F56D9] to-[#9E77ED] text-white shadow-md">
                <Sparkles className="size-5 animate-spin [animation-duration:4s]" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Badge variant="brand" size="sm" dot pulse>
                  Neural Synthesis Pipeline
                </Badge>
                <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-1">
                {currentStageText}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
              {modelName}
            </span>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <ProgressBar
          value={progressPercent}
          max={100}
          showPercentage
          variant="brand"
          size="md"
          striped
          label={`Synthesizing 12-Chapter Exhaustive Document (${completedCount} of 4 stages)`}
          subtext="Allocating 1,000,000 token context window with real-time citations"
        />
      </div>

      {/* Segmented View Switcher */}
      <div className="px-6 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <Tabs
          tabs={[
            { id: "pipeline", label: "Pipeline Stages", icon: <Layers className="size-3.5" /> },
            {
              id: "console",
              label: "Live Code Stream",
              icon: <Terminal className="size-3.5" />,
              count: linesCount > 0 ? linesCount : undefined,
            },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          size="sm"
        />

        {sourcesCount > 0 && (
          <button
            type="button"
            onClick={onViewSources}
            className="text-xs font-semibold text-[#7F56D9] dark:text-[#9E77ED] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Search className="size-3.5" />
            <span>Inspect {sourcesCount} Live Sources ↗</span>
          </button>
        )}
      </div>

      {/* Tab 1: Structured Pipeline Checklist */}
      {activeTab === "pipeline" && (
        <div className="p-6 space-y-3.5 bg-gray-50/50 dark:bg-gray-950/30">
          {steps.map((s, idx) => {
            const isDone = s.status === "completed";
            const isInProg = s.status === "in-progress";

            return (
              <div
                key={s.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  isDone
                    ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xs"
                    : isInProg
                    ? "bg-white dark:bg-gray-900 border-[#7F56D9]/50 dark:border-[#9E77ED]/50 shadow-sm ring-2 ring-[#7F56D9]/10"
                    : "bg-gray-100/50 dark:bg-gray-900/40 border-transparent opacity-60"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="shrink-0 mt-0.5">
                    {isDone ? (
                      <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">
                        <CheckCircle2 className="size-4 stroke-[2.5]" />
                      </span>
                    ) : isInProg ? (
                      <span className="relative flex size-7 items-center justify-center rounded-full bg-[#F4EBFF] dark:bg-[#2C1C5F] text-[#7F56D9] dark:text-[#9E77ED]">
                        <span className="size-2 rounded-full bg-[#7F56D9] dark:bg-[#9E77ED] animate-pulse" />
                      </span>
                    ) : (
                      <span className="flex size-7 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 text-xs font-bold font-mono">
                        {idx + 1}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4
                      className={`text-xs sm:text-sm font-bold leading-tight ${
                        isDone
                          ? "text-gray-900 dark:text-white"
                          : isInProg
                          ? "text-[#7F56D9] dark:text-[#9E77ED]"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {s.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {s.description}
                    </p>
                  </div>
                </div>

                <div>
                  {isDone ? (
                    <Badge variant="success" size="sm">
                      Completed
                    </Badge>
                  ) : isInProg ? (
                    <Badge variant="brand" size="sm" dot pulse>
                      Processing
                    </Badge>
                  ) : (
                    <Badge variant="gray" size="sm">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Live Code Stream Terminal */}
      {activeTab === "console" && (
        <div className="p-5 font-mono text-xs text-gray-300 bg-[#090D13] max-h-72 overflow-y-auto space-y-2 border-t border-gray-800">
          <div className="text-gray-500 text-[11px] pb-1 border-b border-gray-800/80">
            // compiler-runtime.ts • AST Grammar Execution
          </div>
          {typedCodeLines.map((line, idx) => (
            <div key={idx} className="flex items-start gap-2.5 leading-relaxed animate-in fade-in duration-200">
              <span className="text-gray-600 select-none text-[11px]">
                {(idx + 1).toString().padStart(2, "0")}
              </span>
              <span
                className={
                  line.includes("INIT") || line.includes("AUTH")
                    ? "text-[#58A6FF]"
                    : line.includes("TAVILY") || line.includes("HTTP")
                    ? "text-[#D2A8FF]"
                    : line.includes("SCHEMA") || line.includes("AST")
                    ? "text-[#79C0FF]"
                    : line.includes("VALIDATOR") || line.includes("READY")
                    ? "text-[#7EE787]"
                    : "text-gray-300"
                }
              >
                {line}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-green-400 pt-1">
            <span className="text-green-500">▶</span>
            <span>Synthesizing structured document schema...</span>
            <span className="inline-block w-2 h-4 bg-green-400 cursor-blink" />
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-4 sm:p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-amber-500" />
          <span>Output format: <strong className="text-gray-800 dark:text-gray-200 uppercase">{format}</strong></span>
          <span>•</span>
          <span>Target: <strong>30–50 Pages In-Depth</strong></span>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
          >
            Cancel Generation
          </button>
        )}
      </div>
    </div>
  );
}
