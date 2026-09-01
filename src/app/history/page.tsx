"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import styles from "./page.module.css";
import { ArrowLeft, FileText, Calendar } from "lucide-react";

interface DocRecord {
  _id: string;
  title: string;
  format: string;
  docType: string;
  updatedAt: string;
  status: string;
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/documents");
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
        }
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [authLoading]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Document History</h1>
        <button className={styles.backBtn} onClick={() => router.push("/")}>
          <ArrowLeft size={16} /> Back to Studio
        </button>
      </div>

      {!user && !authLoading && (
        <div className={styles.unauthed}>
          <h3 style={{ color: "#fff", marginBottom: "0.5rem" }}>You are viewing local history</h3>
          <p style={{ color: "#8b949e", marginBottom: "1rem" }}>
            Sign in to securely cloud-sync your generated documents across all devices.
          </p>
          <button className={styles.backBtn} style={{ margin: "0 auto", background: "#fff", color: "#000" }} onClick={() => router.push("/login")}>
            Sign In Now
          </button>
        </div>
      )}

      {loading || authLoading ? (
        <div style={{ textAlign: "center", color: "#8b949e", marginTop: "2rem" }}>Loading history...</div>
      ) : documents.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={48} style={{ opacity: 0.2, margin: "0 auto 1rem auto" }} />
          <h3>No documents yet</h3>
          <p>You haven't generated any documents. Head back to the studio to create your first one!</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {documents.map((doc) => (
            <div key={doc._id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.docTitle}>{doc.title || "Untitled Document"}</h3>
                  <div className={styles.docMeta}>
                    <Calendar size={12} />
                    {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })}
                  </div>
                </div>
                <span className={styles.badge}>{doc.format.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#8b949e" }}>
                Type: {doc.docType}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
