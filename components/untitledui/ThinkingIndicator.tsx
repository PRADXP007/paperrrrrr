import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Loader2,
  Search,
  BookOpen,
  FileCode2,
  Terminal,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Badge, BadgeGroup } from "./Badge";
import { ProgressBar } from "./ProgressBar";

export interface StreamEvent {
  id: string;
  timestamp: string;
  type: "status" | "research" | "outline" | "section" | "complete" | "error";
  title: string;
  detail?: string;
}

interface ThinkingIndicatorProps {
  statusText: string;
  modelName?: string;
  isStreaming?: boolean;
  events?: StreamEvent[];
  activeStepIndex?: number;
  totalSteps?: number;
  sourcesCount?: number;
  onViewSources?: () => void;
  className?: string;
}

export function ThinkingIndicator({
  statusText,
  modelName = "Gemini 3.6 Flash",
  isStreaming = true,
  events = [],
  activeStepIndex = 1,
  totalSteps = 12,
  sourcesCount = 0,
  onViewSources,
  className = "",
}: ThinkingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (!isStreaming) return;
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isStreaming]);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins > 0 ? `${mins}m ` : ""}${s}s`;
  };

  return (
    <div
      className={`w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 shadow-sm backdrop-blur-md overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col gap-3.5 border-b border-gray-100 dark:border-gray-800/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Animated Dual-Ring Halo Beacon */}
            <div className="relative flex items-center justify-center size-10 sm:size-11">
              {isStreaming ? (
                <>
                  <span className="absolute size-full rounded-full bg-[#7F56D9]/25 dark:bg-[#9E77ED]/25 animate-ping opacity-75" />
                  <span className="absolute size-9 rounded-full bg-[#7F56D9]/15 dark:bg-[#9E77ED]/20 animate-pulse" />
                  <div className="relative flex size-9 sm:size-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#7F56D9] to-[#9E77ED] text-white shadow-md">
                    <Sparkles className="size-4 sm:size-5 animate-spin [animation-duration:4s]" />
                  </div>
                </>
              ) : (
                <div className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                  <CheckCircle2 className="size-5" />
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Badge
                  variant={isStreaming ? "brand" : "success"}
                  size="sm"
                  dot
                  pulse={isStreaming}
                >
                  {isStreaming ? "Reasoning & Synthesizing" : "Synthesis Complete"}
                </Badge>
                <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatElapsed(secondsElapsed)}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mt-0.5 leading-snug">
                {statusText}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sourcesCount > 0 && (
              <button
                type="button"
                onClick={onViewSources}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors cursor-pointer border border-gray-200/60 dark:border-gray-700"
              >
                <Search className="size-3.5 text-[#7F56D9] dark:text-[#9E77ED]" />
                <span>{sourcesCount} Sources</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
            >
              <span>{isExpanded ? "Hide Steps" : "Show Steps"}</span>
              {isExpanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar inside Header */}
        <ProgressBar
          value={activeStepIndex}
          max={totalSteps}
          showPercentage
          variant="brand"
          size="sm"
          striped={isStreaming}
          indeterminate={isStreaming && activeStepIndex === 0}
          label={`Document Progress: Chapter ${activeStepIndex} of ${totalSteps}`}
        />
      </div>

      {/* Expandable Thinking Process Logs */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-gray-50/50 dark:bg-gray-950/40 divide-y divide-gray-100 dark:divide-gray-800/60">
          <div className="flex items-center justify-between pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Cpu className="size-3.5 text-[#7F56D9] dark:text-[#9E77ED]" />
              Reasoning Engine: <strong className="text-gray-800 dark:text-gray-200">{modelName}</strong>
            </span>
            <span className="font-mono text-[11px]">
              {events.length} stream events recorded
            </span>
          </div>

          <div className="pt-3 space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {events.length === 0 ? (
              <div className="text-xs text-gray-400 dark:text-gray-500 italic py-2 flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin text-[#7F56D9]" />
                Initializing neural synthesis context and Tavily search vector arrays...
              </div>
            ) : (
              events.map((ev, i) => {
                const isSection = ev.type === "section";
                const isResearch = ev.type === "research";
                const isComplete = ev.type === "complete";

                return (
                  <div
                    key={ev.id || i}
                    className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 animate-in fade-in duration-200"
                  >
                    <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500 shrink-0 pt-0.5">
                      {ev.timestamp ? ev.timestamp.split(" ")[0] : `[#${i + 1}]`}
                    </span>

                    <div className="shrink-0 mt-0.5">
                      {isComplete ? (
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : isSection ? (
                        <BookOpen className="size-3.5 text-[#7F56D9] dark:text-[#9E77ED]" />
                      ) : isResearch ? (
                        <Search className="size-3.5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-[#7F56D9] mt-1.5 inline-block" />
                      )}
                    </div>

                    <div className="flex-1">
                      <span
                        className={`font-medium ${
                          isComplete
                            ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                            : isSection
                            ? "text-gray-900 dark:text-white font-semibold"
                            : "text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {ev.title}
                      </span>
                      {ev.detail && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 pl-2 border-l border-gray-200 dark:border-gray-700">
                          {ev.detail}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isStreaming && (
              <div className="flex items-center gap-2 pt-2 text-xs font-mono text-[#7F56D9] dark:text-[#9E77ED] animate-pulse">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Generating prose & structured OpenXML schema nodes...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
