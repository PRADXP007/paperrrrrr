import React from "react";
import styles from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "segmented" | "underline";
  size?: "sm" | "md";
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = "segmented",
  size = "md",
  className = "",
}: TabsProps) {
  if (variant === "underline") {
    return (
      <div className={`${styles.tabsContainer} ${styles.underlineContainer} ${className}`}>
        <nav className={`${styles.nav} ${styles.underlineNav}`} aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                disabled={tab.disabled}
                onClick={() => onChange(tab.id)}
                className={`${styles.underlineTab} ${isActive ? styles.active : ""}`}
              >
                {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={styles.count}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // Segmented control
  return (
    <div className={`${styles.segmentedContainer} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`${styles.segmentedTab} ${styles[size]} ${isActive ? styles.active : ""}`}
          >
            {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={styles.count}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
