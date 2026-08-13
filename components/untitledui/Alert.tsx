import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";

export type AlertVariant = "brand" | "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  {
    container: string;
    iconBg: string;
    iconText: string;
    titleText: string;
    descText: string;
    defaultIcon: React.ReactNode;
  }
> = {
  brand: {
    container:
      "bg-[#F9F5FF] dark:bg-[#2C1C5F]/40 border-[#E9D7FE] dark:border-[#53389E]",
    iconBg: "bg-[#F4EBFF] dark:bg-[#3E1C7E]",
    iconText: "text-[#7F56D9] dark:text-[#E9D7FE]",
    titleText: "text-[#6941C6] dark:text-[#E9D7FE]",
    descText: "text-[#53389E] dark:text-[#D6BBFB]",
    defaultIcon: <Info className="size-4" />,
  },
  info: {
    container: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
    iconBg: "bg-blue-100 dark:bg-blue-900",
    iconText: "text-blue-700 dark:text-blue-300",
    titleText: "text-blue-900 dark:text-blue-200",
    descText: "text-blue-700 dark:text-blue-300",
    defaultIcon: <Info className="size-4" />,
  },
  success: {
    container:
      "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    iconBg: "bg-emerald-100 dark:bg-emerald-900",
    iconText: "text-emerald-700 dark:text-emerald-300",
    titleText: "text-emerald-900 dark:text-emerald-200",
    descText: "text-emerald-700 dark:text-emerald-300",
    defaultIcon: <CheckCircle2 className="size-4" />,
  },
  warning: {
    container:
      "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
    iconBg: "bg-amber-100 dark:bg-amber-900",
    iconText: "text-amber-700 dark:text-amber-300",
    titleText: "text-amber-900 dark:text-amber-200",
    descText: "text-amber-700 dark:text-amber-300",
    defaultIcon: <AlertTriangle className="size-4" />,
  },
  error: {
    container:
      "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
    iconBg: "bg-rose-100 dark:bg-rose-900",
    iconText: "text-rose-700 dark:text-rose-300",
    titleText: "text-rose-900 dark:text-rose-200",
    descText: "text-rose-700 dark:text-rose-300",
    defaultIcon: <AlertCircle className="size-4" />,
  },
};

export function Alert({
  variant = "brand",
  title,
  description,
  icon,
  onDismiss,
  action,
  className = "",
}: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`relative flex items-start gap-3.5 p-4 rounded-xl border ${styles.container} transition-all shadow-xs ${className}`}
      role="alert"
    >
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconText}`}
      >
        {icon || styles.defaultIcon}
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <h4 className={`text-xs sm:text-sm font-bold leading-tight ${styles.titleText}`}>
          {title}
        </h4>
        {description && (
          <p className={`text-xs mt-1 leading-relaxed ${styles.descText}`}>
            {description}
          </p>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={`mt-2 text-xs font-bold underline cursor-pointer hover:opacity-80 ${styles.titleText}`}
          >
            {action.label} →
          </button>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer rounded-md"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
