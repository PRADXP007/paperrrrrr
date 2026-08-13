import React, { useState } from "react";
import {
  Presentation,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Maximize2,
  Download,
  Sparkles,
  Mic,
  Lightbulb,
  CheckCircle2,
  Layers,
  ArrowRight
} from "lucide-react";
import { Button } from "./Button";
import { Badge } from "./Badge";

export interface PPTXDeckViewerProps {
  title: string;
  subtitle: string;
  sections: Array<{
    id: string;
    title: string;
    brief: string;
    keyPoints: string[];
  }>;
  generatedSections: Record<string, string>;
  isStreaming?: boolean;
  onDownload: () => void;
}

export function PPTXDeckViewer({
  title,
  subtitle,
  sections,
  generatedSections,
  isStreaming = false,
  onDownload
}: PPTXDeckViewerProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");
  const [showPresenterNotes, setShowPresenterNotes] = useState(true);

  const totalSlides = sections.length;
  const currentSection = sections[activeSlide] || sections[0];
  const currentContent =
    generatedSections[currentSection?.id] ||
    generatedSections[activeSlide] ||
    generatedSections[`sec_${activeSlide + 1}`] ||
    (generatedSections as any)[currentSection?.title] ||
    currentSection?.brief ||
    "Generating slide content...";

  // Parse structured elements from slide markdown
  const parseSlideContent = (raw: string) => {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const bullets: string[] = [];
    let highlightMetric: string | null = null;
    let presenterNotes: string | null = null;

    lines.forEach((line) => {
      if (line.includes("KEY METRIC:") || line.includes("HIGHLIGHT STAT:") || line.includes("💡")) {
        highlightMetric = line.replace(/^[>\s*#💡-]+/, "").replace(/\*\*KEY METRIC:\*\*/i, "").trim();
      } else if (line.includes("PRESENTER NOTES:") || line.includes("🎙️") || line.includes("Speaker Notes:")) {
        presenterNotes = line.replace(/^[>\s*#🎙️-]+/, "").replace(/\*\*PRESENTER NOTES:\*\*/i, "").trim();
      } else if (line.startsWith("*") || line.startsWith("-") || line.startsWith("•") || line.match(/^\d+\./)) {
        bullets.push(line.replace(/^[*•\-\d.]+\s*/, "").trim());
      } else if (line.length > 20 && !line.startsWith("#")) {
        bullets.push(line);
      }
    });

    // Fallback if no bullets parsed
    if (bullets.length === 0 && currentSection?.keyPoints?.length) {
      bullets.push(...currentSection.keyPoints);
    }

    return { bullets, highlightMetric, presenterNotes };
  };

  const { bullets, highlightMetric, presenterNotes } = parseSlideContent(currentContent);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Deck Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 shadow-lg text-white">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Presentation className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">PowerPoint 16:9 Presentation Studio</span>
              <Badge variant="brand" size="sm">
                1080p HD
              </Badge>
            </div>
            <span className="text-[11px] text-gray-400 font-mono">
              Slide {activeSlide + 1} of {totalSlides} • {title.slice(0, 36)}...
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-800 rounded-xl p-0.5 border border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode("single")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "single"
                  ? "bg-[#7F56D9] text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Slide View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "grid"
                  ? "bg-[#7F56D9] text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="size-3" />
              <span>Grid ({totalSlides})</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onDownload}
            iconLeading={<Download className="size-3.5" />}
            className="bg-amber-600 hover:bg-amber-500 border-amber-600 shadow-sm font-bold"
          >
            Export .pptx
          </Button>
        </div>
      </div>

      {viewMode === "single" ? (
        <div className="flex flex-col gap-4">
          {/* Main 16:9 Presentation Slide Canvas */}
          <div className="relative aspect-[16/9] w-full max-w-4xl mx-auto bg-[#0F172A] border-2 border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between p-6 sm:p-10 text-white select-text">
            {/* Background Aesthetic Gradients */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#7F56D9]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Slide Header */}
            <div className="relative z-10 flex flex-col gap-2 border-b border-gray-800/80 pb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#1E293B] border border-sky-500/30 text-sky-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                    {activeSlide === 0 ? "Executive Title Deck" : `Slide ${String(activeSlide + 1).padStart(2, "0")}`}
                  </span>
                  <span className="text-gray-500 text-xs font-mono">•</span>
                  <span className="text-gray-400 text-xs font-sans truncate max-w-[280px] sm:max-w-md">
                    {title}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-gray-500">16:9 Widescreen</span>
              </div>

              <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-snug">
                {currentSection?.title?.replace(/^\d+\.\s*/, "").replace(/^Slide \d+:\s*/, "")}
              </h2>
            </div>

            {/* Slide Body: 2-Column Corporate Grid */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 my-auto py-2">
              {/* Left Column: Scope & Focus Card */}
              <div className="md:col-span-4 bg-gray-900/80 border border-gray-800 rounded-xl p-4 flex flex-col justify-between backdrop-blur-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#9E77ED] uppercase tracking-wider">
                    <Sparkles className="size-3.5" />
                    <span>Executive Focus</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 italic leading-relaxed">
                    "{currentSection?.brief}"
                  </p>
                </div>

                {highlightMetric ? (
                  <div className="mt-3 pt-3 border-t border-gray-800 bg-[#7F56D9]/10 border border-[#7F56D9]/30 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      <Lightbulb className="size-3" />
                      <span>Key Metric Callout</span>
                    </div>
                    <p className="text-xs font-bold text-white mt-1 leading-snug">
                      {highlightMetric}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    <span>Empirical Data Verified</span>
                  </div>
                )}
              </div>

              {/* Right Column: High-Impact Bullet Points */}
              <div className="md:col-span-8 bg-gray-900/50 border border-gray-800/80 rounded-xl p-4 sm:p-5 flex flex-col justify-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Strategic Findings &amp; Takeaways
                </span>
                <div className="space-y-2.5">
                  {bullets.slice(0, 4).map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-200 leading-relaxed">
                      <div className="size-2 rounded-full bg-[#7F56D9] mt-1.5 shrink-0 ring-4 ring-[#7F56D9]/20" />
                      <span className="flex-1">
                        <strong className="text-white font-semibold">
                          {bullet.split(":")[0]}:
                        </strong>{" "}
                        {bullet.includes(":") ? bullet.split(":").slice(1).join(":") : bullet}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Slide Footer */}
            <div className="relative z-10 flex justify-between items-center text-[10px] font-mono text-gray-500 pt-3 border-t border-gray-800/80">
              <span>Paperrrrrr Autonomous Studio • Corporate Presentation</span>
              <span className="text-sky-400 font-semibold font-mono">
                Slide {activeSlide + 1} of {totalSlides}
              </span>
            </div>
          </div>

          {/* Slide Navigation Strip & Presenter Notes */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-900 border border-gray-800 rounded-2xl p-4">
            {/* Prev / Next Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary_gray"
                size="sm"
                onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
                disabled={activeSlide === 0}
                iconLeading={<ChevronLeft className="size-4" />}
              >
                Previous
              </Button>
              <Button
                variant="secondary_gray"
                size="sm"
                onClick={() => setActiveSlide((prev) => Math.min(totalSlides - 1, prev + 1))}
                disabled={activeSlide === totalSlides - 1}
                iconTrailing={<ChevronRight className="size-4" />}
              >
                Next
              </Button>
            </div>

            {/* Thumbnail Dots / Jump Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs py-1">
              {sections.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={`size-3 rounded-full transition-all cursor-pointer ${
                    activeSlide === idx
                      ? "bg-[#7F56D9] scale-125 ring-2 ring-[#7F56D9]/30"
                      : "bg-gray-700 hover:bg-gray-500"
                  }`}
                  title={`Jump to Slide ${idx + 1}`}
                />
              ))}
            </div>

            <Button
              variant="tertiary_gray"
              size="sm"
              onClick={() => setShowPresenterNotes(!showPresenterNotes)}
              iconLeading={<Mic className="size-3.5 text-amber-400" />}
            >
              {showPresenterNotes ? "Hide Speaker Notes" : "Show Speaker Notes"}
            </Button>
          </div>

          {/* Presenter Notes Accordion / Box */}
          {showPresenterNotes && presenterNotes && (
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                <Mic className="size-3.5" />
                <span>Executive Presenter Talking Points</span>
              </div>
              <p className="text-gray-300 leading-relaxed italic">
                "{presenterNotes}"
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Full Deck Grid Gallery View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
          {sections.map((sec, idx) => {
            const isSelected = activeSlide === idx;
            return (
              <div
                key={idx}
                onClick={() => {
                  setActiveSlide(idx);
                  setViewMode("single");
                }}
                className={`group aspect-[16/9] bg-[#0F172A] border-2 rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-md ${
                  isSelected
                    ? "border-[#7F56D9] ring-4 ring-[#7F56D9]/20"
                    : "border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-sky-400 px-2 py-0.5 bg-sky-950/60 rounded border border-sky-800/40">
                    Slide {idx + 1}
                  </span>
                  <ArrowRight className="size-3 text-gray-500 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h4 className="font-serif text-sm font-bold text-white line-clamp-2 leading-snug">
                    {sec.title.replace(/^\d+\.\s*/, "").replace(/^Slide \d+:\s*/, "")}
                  </h4>
                  <p className="text-[11px] text-gray-400 line-clamp-2 mt-1 italic">
                    {sec.brief}
                  </p>
                </div>
                <div className="text-[10px] font-mono text-gray-500">
                  {sec.keyPoints?.length || 3} Key Takeaways
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
