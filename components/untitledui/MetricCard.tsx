import React from "react";
import { Badge } from "./Badge";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  badgeText?: string;
  badgeVariant?: "brand" | "gray" | "success" | "warning" | "error" | "blue";
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtext,
  icon,
  badgeText,
  badgeVariant = "brand",
  trend,
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between gap-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
          {label}
        </span>
        {icon && (
          <div className="flex size-8 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 dark:text-white tracking-tight">
          {value}
        </div>
        {badgeText && (
          <Badge variant={badgeVariant} size="sm" dot>
            {badgeText}
          </Badge>
        )}
      </div>

      {(subtext || trend) && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {trend && (
            <span
              className={`font-semibold ${
                trend.isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {trend.value}
            </span>
          )}
          {subtext && <span>{subtext}</span>}
        </div>
      )}
    </div>
  );
}
