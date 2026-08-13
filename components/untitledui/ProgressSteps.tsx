import React from "react";
import { Check, Loader2 } from "lucide-react";

export interface ProgressStepItem {
  id: string;
  title: string;
  description?: string;
  status: "complete" | "current" | "upcoming";
  badgeText?: string;
}

interface ProgressStepsProps {
  steps: ProgressStepItem[];
  orientation?: "horizontal" | "vertical";
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export function ProgressSteps({
  steps,
  orientation = "horizontal",
  onStepClick,
  className = "",
}: ProgressStepsProps) {
  if (orientation === "vertical") {
    return (
      <nav aria-label="Progress" className={`flex flex-col ${className}`}>
        <ol className="overflow-hidden">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <li
                key={step.id}
                className={`relative pb-6 ${isLast ? "pb-0" : ""}`}
              >
                {!isLast && (
                  <div
                    className={`absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 ${
                      step.status === "complete"
                        ? "bg-[#7F56D9] dark:bg-[#9E77ED]"
                        : "bg-gray-200 dark:bg-gray-800"
                    }`}
                    aria-hidden="true"
                  />
                )}
                <div
                  onClick={() => onStepClick && onStepClick(step.id)}
                  className={`group relative flex items-start ${
                    onStepClick ? "cursor-pointer" : ""
                  }`}
                >
                  <span className="flex h-8 items-center" aria-hidden="true">
                    {step.status === "complete" ? (
                      <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-[#7F56D9] text-white shadow-xs">
                        <Check className="size-4 stroke-[2.5]" />
                      </span>
                    ) : step.status === "current" ? (
                      <span className="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-[#7F56D9] dark:border-[#9E77ED] bg-white dark:bg-gray-900 ring-4 ring-[#7F56D9]/20 shadow-xs">
                        <span className="size-2.5 rounded-full bg-[#7F56D9] dark:bg-[#9E77ED] animate-pulse" />
                      </span>
                    ) : (
                      <span className="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-xs font-semibold">
                        {index + 1}
                      </span>
                    )}
                  </span>
                  <div className="ml-4 min-w-0 flex flex-col pt-0.5">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        step.status === "complete" || step.status === "current"
                          ? "text-[#7F56D9] dark:text-[#9E77ED]"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      Step {index + 1}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        step.status === "current"
                          ? "text-gray-900 dark:text-white"
                          : step.status === "complete"
                          ? "text-gray-800 dark:text-gray-100"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {step.title}
                    </span>
                    {step.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {step.description}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  // Horizontal layout
  return (
    <nav aria-label="Progress" className={`w-full ${className}`}>
      <ol className="flex items-center justify-between gap-2 sm:gap-4 w-full">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li
              key={step.id}
              className={`flex-1 flex items-center ${
                !isLast ? "relative" : ""
              }`}
            >
              <div
                onClick={() => onStepClick && onStepClick(step.id)}
                className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all ${
                  onStepClick ? "cursor-pointer hover:bg-gray-100/70 dark:hover:bg-gray-800/70" : ""
                } ${
                  step.status === "current"
                    ? "bg-[#F9F5FF] dark:bg-[#2C1C5F]/40 border border-[#E9D7FE] dark:border-[#53389E] shadow-xs"
                    : "border border-transparent"
                }`}
              >
                {/* Step Circle */}
                <div className="shrink-0">
                  {step.status === "complete" ? (
                    <span className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-[#7F56D9] text-white shadow-xs">
                      <Check className="size-3.5 sm:size-4 stroke-[2.5]" />
                    </span>
                  ) : step.status === "current" ? (
                    <span className="relative flex size-7 sm:size-8 items-center justify-center rounded-full border-2 border-[#7F56D9] dark:border-[#9E77ED] bg-white dark:bg-gray-900 ring-4 ring-[#7F56D9]/20 shadow-xs">
                      <span className="size-2 sm:size-2.5 rounded-full bg-[#7F56D9] dark:bg-[#9E77ED] animate-pulse" />
                    </span>
                  ) : (
                    <span className="flex size-7 sm:size-8 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-xs font-semibold">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Step Text */}
                <div className="hidden sm:flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        step.status === "current"
                          ? "text-[#7F56D9] dark:text-[#9E77ED]"
                          : step.status === "complete"
                          ? "text-gray-700 dark:text-gray-300"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      Step {index + 1}
                    </span>
                    {step.status === "current" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#F4EBFF] text-[#6941C6] dark:bg-[#2C1C5F] dark:text-[#E9D7FE]">
                        Active
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold truncate ${
                      step.status === "current"
                        ? "text-gray-900 dark:text-white"
                        : step.status === "complete"
                        ? "text-gray-800 dark:text-gray-200"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              </div>

              {!isLast && (
                <div className="hidden md:block w-8 lg:w-12 h-0.5 bg-gray-200 dark:bg-gray-800 mx-1 shrink-0">
                  <div
                    className={`h-full ${
                      step.status === "complete"
                        ? "bg-[#7F56D9] dark:bg-[#9E77ED]"
                        : "w-0"
                    } transition-all duration-300`}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
