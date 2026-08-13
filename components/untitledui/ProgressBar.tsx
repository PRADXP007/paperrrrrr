import React from "react";

export type ProgressVariant = "brand" | "success" | "warning" | "error" | "blue";
export type ProgressSize = "xs" | "sm" | "md" | "lg";

interface ProgressBarProps {
  value?: number; // 0 to 100
  max?: number;
  label?: string;
  subtext?: string;
  showPercentage?: boolean;
  variant?: ProgressVariant;
  size?: ProgressSize;
  indeterminate?: boolean;
  striped?: boolean;
  className?: string;
}

const variantColors: Record<ProgressVariant, { bar: string; text: string; bg: string }> = {
  brand: {
    bar: "bg-[#7F56D9] dark:bg-[#9E77ED]",
    text: "text-[#7F56D9] dark:text-[#9E77ED]",
    bg: "bg-gray-100 dark:bg-gray-800",
  },
  success: {
    bar: "bg-emerald-600 dark:bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-100/50 dark:bg-emerald-950/40",
  },
  warning: {
    bar: "bg-amber-500 dark:bg-amber-400",
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-100/50 dark:bg-amber-950/40",
  },
  error: {
    bar: "bg-rose-600 dark:bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-100/50 dark:bg-rose-950/40",
  },
  blue: {
    bar: "bg-blue-600 dark:bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-100/50 dark:bg-blue-950/40",
  },
};

const heightSizes: Record<ProgressSize, string> = {
  xs: "h-1",
  sm: "h-2",
  md: "h-2.5",
  lg: "h-3.5",
};

export function ProgressBar({
  value = 0,
  max = 100,
  label,
  subtext,
  showPercentage = false,
  variant = "brand",
  size = "md",
  indeterminate = false,
  striped = false,
  className = "",
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const colors = variantColors[variant];
  const height = heightSizes[size];

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-200">
          {label && <span>{label}</span>}
          {showPercentage && (
            <span className={`font-mono font-bold ${colors.text}`}>
              {indeterminate ? "Processing..." : `${percentage}%`}
            </span>
          )}
        </div>
      )}

      <div
        className={`relative w-full overflow-hidden rounded-full ${colors.bg} ${height}`}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {indeterminate ? (
          <div
            className={`absolute top-0 bottom-0 left-0 right-0 ${colors.bar} rounded-full animate-[indeterminate_1.5s_infinite_ease-in-out]`}
            style={{
              backgroundImage:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
            }}
          />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${colors.bar} ${
              striped
                ? "bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] animate-[move-bg_1s_linear_infinite]"
                : ""
            }`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>

      {subtext && (
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          {subtext}
        </div>
      )}
    </div>
  );
}

export function CircularProgress({
  value = 0,
  max = 100,
  size = 48,
  strokeWidth = 4,
  variant = "brand",
  showValue = true,
  className = "",
}: {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: ProgressVariant;
  showValue?: boolean;
  className?: string;
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const colors = variantColors[variant];

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-800 fill-none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${colors.text} fill-none transition-all duration-500 ease-out`}
        />
      </svg>
      {showValue && (
        <span className="absolute text-[10px] font-mono font-bold text-gray-800 dark:text-gray-100">
          {percentage}%
        </span>
      )}
    </div>
  );
}
