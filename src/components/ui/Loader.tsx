import React from "react";
import styles from "./Loader.module.css";

export function Loader() {
  return (
    <div className={styles.loaderContainer}>
      <div className={styles.loader}>
        <span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </span>
        <div className={styles.base}>
          <span></span>
        </div>
        <div className={styles.face}></div>
      </div>
    </div>
  );
}
