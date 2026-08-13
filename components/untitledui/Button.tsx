import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary_gray"
  | "secondary_color"
  | "tertiary_gray"
  | "destructive"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  iconLeading?: React.ReactNode;
  iconTrailing?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#7F56D9] text-white hover:bg-[#6941C6] active:bg-[#53389E] dark:bg-[#7F56D9] dark:hover:bg-[#6941C6] dark:active:bg-[#53389E] dark:text-white font-semibold shadow-sm border border-[#7F56D9] focus-visible:ring-4 focus-visible:ring-[#7F56D9]/20",
  secondary_gray:
    "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 font-semibold shadow-xs focus-visible:ring-4 focus-visible:ring-gray-200 dark:focus-visible:ring-gray-800",
  secondary_color:
    "bg-[#F9F5FF] dark:bg-[#2C1C5F]/60 text-[#6941C6] dark:text-[#E9D7FE] border border-[#E9D7FE] dark:border-[#53389E] hover:bg-[#F4EBFF] active:bg-[#E9D7FE] font-semibold focus-visible:ring-4 focus-visible:ring-[#7F56D9]/20",
  tertiary_gray:
    "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/80 active:bg-gray-200 font-semibold focus-visible:ring-4 focus-visible:ring-gray-200",
  destructive:
    "bg-[#D92D20] text-white hover:bg-[#B42318] active:bg-[#912018] font-semibold shadow-xs focus-visible:ring-4 focus-visible:ring-[#FDA29B]",
  link: "bg-transparent text-[#6941C6] dark:text-[#9E77ED] hover:underline p-0 h-auto font-semibold focus-visible:ring-2 focus-visible:ring-[#7F56D9]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-3.5 py-2 text-xs sm:text-sm gap-2 rounded-lg",
  lg: "px-4 py-2.5 text-sm gap-2 rounded-xl",
  xl: "px-5 py-3 text-base gap-2.5 rounded-xl",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText,
  iconLeading,
  iconTrailing,
  disabled,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center transition-all duration-150 outline-none select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${v} ${s} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin shrink-0" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {iconLeading && <span className="shrink-0">{iconLeading}</span>}
          <span>{children}</span>
          {iconTrailing && <span className="shrink-0">{iconTrailing}</span>}
        </>
      )}
    </button>
  );
}
