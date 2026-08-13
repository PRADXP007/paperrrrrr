import React from "react";

export type BadgeVariant =
  | "brand"
  | "gray"
  | "success"
  | "warning"
  | "error"
  | "blue"
  | "purple"
  | "indigo";

export type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dot: string }> = {
  brand: {
    bg: "bg-[#F9F5FF] dark:bg-[#2C1C5F]/60",
    text: "text-[#6941C6] dark:text-[#D6BBFB]",
    border: "border-[#E9D7FE] dark:border-[#53389E]",
    dot: "bg-[#7F56D9] dark:bg-[#9E77ED]",
  },
  gray: {
    bg: "bg-gray-50 dark:bg-gray-800/80",
    text: "text-gray-700 dark:text-gray-200",
    border: "border-gray-200 dark:border-gray-700",
    dot: "bg-gray-500",
  },
  success: {
    bg: "bg-[#ECFDF3] dark:bg-[#053321]/60",
    text: "text-[#027A48] dark:text-[#6CE9A6]",
    border: "border-[#A6F4C5] dark:border-[#087443]",
    dot: "bg-[#12B76A]",
  },
  warning: {
    bg: "bg-[#FEF6EE] dark:bg-[#4E1D09]/60",
    text: "text-[#B54708] dark:text-[#FDB022]",
    border: "border-[#F9DBAF] dark:border-[#93370D]",
    dot: "bg-[#F79009]",
  },
  error: {
    bg: "bg-[#FEF3F2] dark:bg-[#55160C]/60",
    text: "text-[#B42318] dark:text-[#FDA29B]",
    border: "border-[#FECDCA] dark:border-[#912018]",
    dot: "bg-[#F04438]",
  },
  blue: {
    bg: "bg-[#F0F9FF] dark:bg-[#082F49]/60",
    text: "text-[#026AA2] dark:text-[#7CD4FD]",
    border: "border-[#B9E6FE] dark:border-[#0BA5EC]",
    dot: "bg-[#0BA5EC]",
  },
  purple: {
    bg: "bg-[#FAF5FF] dark:bg-[#3B0764]/60",
    text: "text-[#7E22CE] dark:text-[#D8B4FE]",
    border: "border-[#E9D5FF] dark:border-[#A855F7]",
    dot: "bg-[#A855F7]",
  },
  indigo: {
    bg: "bg-[#EEF4FF] dark:bg-[#1E1B4B]/60",
    text: "text-[#3538CD] dark:text-[#A4BCFD]",
    border: "border-[#C7D7FE] dark:border-[#6172F3]",
    dot: "bg-[#6172F3]",
  },
};

const sizeStyles: Record<BadgeSize, { container: string; dot: string; text: string }> = {
  sm: { container: "px-2 py-0.5 text-[11px] gap-1.5", dot: "size-1.5", text: "font-medium" },
  md: { container: "px-2.5 py-1 text-xs gap-1.5", dot: "size-2", text: "font-semibold" },
  lg: { container: "px-3 py-1.5 text-sm gap-2", dot: "size-2.5", text: "font-semibold" },
};

export function Badge({
  children,
  variant = "gray",
  size = "md",
  dot = false,
  pulse = false,
  icon,
  className = "",
  ...props
}: BadgeProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${v.bg} ${v.text} ${v.border} ${s.container} ${s.text} transition-colors ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex shrink-0 items-center justify-center">
          {pulse && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${v.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full ${s.dot} ${v.dot}`} />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

interface BadgeGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  tag: string;
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  onClick?: () => void;
}

export function BadgeGroup({
  tag,
  children,
  variant = "brand",
  size = "md",
  dot = false,
  pulse = false,
  className = "",
  onClick,
  ...props
}: BadgeGroupProps) {
  const v = variantStyles[variant];
  const isSm = size === "sm";

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center rounded-full border ${v.bg} ${v.border} p-1 ${
        isSm ? "pr-2.5 text-xs" : "pr-3 text-xs"
      } ${onClick ? "cursor-pointer hover:opacity-90" : ""} transition-all shadow-xs ${className}`}
      {...props}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-gray-900 border ${v.border} ${v.text} font-semibold ${
          isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"
        }`}
      >
        {dot && (
          <span className="relative flex shrink-0 items-center justify-center">
            {pulse && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${v.dot}`}
              />
            )}
            <span className={`relative inline-flex size-1.5 rounded-full ${v.dot}`} />
          </span>
        )}
        {tag}
      </span>
      <span className={`pl-2 font-medium ${v.text} flex items-center gap-1`}>
        {children}
      </span>
    </div>
  );
}
