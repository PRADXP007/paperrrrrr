import React from "react";
import styles from "./Badge.module.css";

export type BadgeVariant = "gray" | "brand" | "success" | "warning" | "error";
export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
}

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
  const classes = [
    styles.badge,
    styles[variant],
    styles[size],
    className
  ].filter(Boolean).join(" ");

  return (
    <span className={classes} {...props}>
      {dot && (
        <span className={styles.dotWrapper}>
          {pulse && <span className={styles.pulse} />}
          <span className={styles.dot} />
        </span>
      )}
      {icon && <span className={styles.icon}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
