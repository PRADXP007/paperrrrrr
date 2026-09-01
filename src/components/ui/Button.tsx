import React from "react";
import { Loader2 } from "lucide-react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  iconLeading?: React.ReactNode;
  iconTrailing?: React.ReactNode;
}

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
  const isDisabled = disabled || isLoading;
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    className
  ].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={classes}
      {...props}
    >
      {isLoading ? (
        <>
          <span className={`${styles.icon} ${styles.spin}`}>
            <Loader2 size={size === "sm" ? 14 : 18} />
          </span>
          {loadingText ? <span>{loadingText}</span> : <span>{children}</span>}
        </>
      ) : (
        <>
          {iconLeading && <span className={styles.icon}>{iconLeading}</span>}
          <span>{children}</span>
          {iconTrailing && <span className={styles.icon}>{iconTrailing}</span>}
        </>
      )}
    </button>
  );
}
