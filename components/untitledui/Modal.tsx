import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconVariant?: "brand" | "gray" | "success" | "warning" | "error" | "blue";
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const iconBgVariants = {
  brand: "bg-[#F9F5FF] dark:bg-[#2C1C5F] text-[#7F56D9] dark:text-[#E9D7FE] ring-8 ring-[#F9F5FF]/60 dark:ring-[#2C1C5F]/40",
  gray: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 ring-8 ring-gray-100/50 dark:ring-gray-800/40",
  success: "bg-[#ECFDF3] dark:bg-[#053321] text-[#027A48] dark:text-[#6CE9A6] ring-8 ring-[#ECFDF3]/60 dark:ring-[#053321]/40",
  warning: "bg-[#FEF6EE] dark:bg-[#4E1D09] text-[#B54708] dark:text-[#FDB022] ring-8 ring-[#FEF6EE]/60 dark:ring-[#4E1D09]/40",
  error: "bg-[#FEF3F2] dark:bg-[#55160C] text-[#B42318] dark:text-[#FDA29B] ring-8 ring-[#FEF3F2]/60 dark:ring-[#55160C]/40",
  blue: "bg-[#F0F9FF] dark:bg-[#082F49] text-[#026AA2] dark:text-[#7CD4FD] ring-8 ring-[#F0F9FF]/60 dark:ring-[#082F49]/40",
};

const maxWidthStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  iconVariant = "brand",
  children,
  footer,
  maxWidth = "md",
  className = "",
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className={`relative z-10 w-full ${maxWidthStyles[maxWidth]} rounded-2xl bg-[#131418] border border-white/10 shadow-2xl transition-all animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col my-8 font-sans ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {icon && (
              <div
                className={`flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-full ${iconBgVariants[iconVariant]}`}
              >
                {icon}
              </div>
            )}
            <div className="flex flex-col">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug">
                {title}
              </h3>
              {description && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-5 sm:px-6 py-2 overflow-y-auto max-h-[calc(85vh-160px)]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-5 sm:p-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-950/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
