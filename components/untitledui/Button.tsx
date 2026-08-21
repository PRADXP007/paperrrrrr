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
    "bg-[#C3644B] text-white hover:bg-[#97422C] active:bg-[#7D3421] font-semibold shadow-sm border border-[#C3644B] focus-visible:ring-4 focus-visible:ring-[#C3644B]/20",
  secondary_gray:
    "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 font-semibold shadow-xs focus-visible:ring-4 focus-visible:ring-gray-200",
  secondary_color:
    "bg-[#FFF4F0] text-[#97422C] border border-[#FFD5C8] hover:bg-[#FFEAE2] active:bg-[#FFD5C8] font-semibold focus-visible:ring-4 focus-visible:ring-[#C3644B]/20",
  tertiary_gray:
    "bg-transparent text-gray-800 hover:bg-gray-100 active:bg-gray-200 font-semibold focus-visible:ring-4 focus-visible:ring-gray-200",
  destructive:
    "bg-[#D92D20] text-white hover:bg-[#B42318] active:bg-[#912018] font-semibold shadow-xs focus-visible:ring-4 focus-visible:ring-[#FDA29B]",
  link: "bg-transparent text-[#C3644B] hover:underline p-0 h-auto font-semibold focus-visible:ring-2 focus-visible:ring-[#C3644B]",
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
