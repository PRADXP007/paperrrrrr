"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DocumentContextType {
  prompt: string;
  setPrompt: (val: string) => void;
  format: string;
  setFormat: (val: string) => void;
  docType: string;
  setDocType: (val: string) => void;
  researchBundle: any;
  setResearchBundle: (val: any) => void;
  outline: any;
  setOutline: (val: any) => void;
  finalSections: any;
  setFinalSections: (val: any) => void;
  font: string;
  setFont: (val: string) => void;
  totalPages: number;
  setTotalPages: (val: number) => void;
  color: string;
  setColor: (val: string) => void;
  audienceContext: string;
  setAudienceContext: (val: string) => void;
  customChapterCount: number;
  setCustomChapterCount: (val: number) => void;
  isInitialized: boolean;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("docx");
  const [docType, setDocType] = useState("Research Report");
  const [researchBundle, setResearchBundle] = useState<any>(null);
  const [outline, setOutline] = useState<any>(null);
  const [finalSections, setFinalSections] = useState<any>({});
  const [font, setFont] = useState("Times New Roman");
  const [totalPages, setTotalPages] = useState(15);
  const [color, setColor] = useState("000000");
  const [audienceContext, setAudienceContext] = useState("College");
  const [customChapterCount, setCustomChapterCount] = useState(6);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load state from localStorage on mount
    const saved = localStorage.getItem("docContext");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.prompt) setPrompt(parsed.prompt);
        if (parsed.format) setFormat(parsed.format);
        if (parsed.docType) setDocType(parsed.docType);
        if (parsed.researchBundle) setResearchBundle(parsed.researchBundle);
        if (parsed.outline) setOutline(parsed.outline);
        if (parsed.finalSections) setFinalSections(parsed.finalSections);
        if (parsed.font) setFont(parsed.font);
        if (parsed.totalPages) setTotalPages(parsed.totalPages);
        if (parsed.color) setColor(parsed.color === "Black" ? "000000" : parsed.color);
        if (parsed.audienceContext) setAudienceContext(parsed.audienceContext);
        if (parsed.customChapterCount) setCustomChapterCount(parsed.customChapterCount);
      } catch (e) {
        console.error("Failed to parse docContext from localStorage");
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    // Save state to localStorage whenever it changes, but only after initial load
    if (!isInitialized) return;
    const data = { prompt, format, docType, researchBundle, outline, finalSections, font, totalPages, color, audienceContext, customChapterCount };
    localStorage.setItem("docContext", JSON.stringify(data));
  }, [prompt, format, docType, researchBundle, outline, finalSections, font, totalPages, color, audienceContext, customChapterCount, isInitialized]);

  return (
    <DocumentContext.Provider
      value={{
        prompt,
        setPrompt,
        format,
        setFormat,
        docType,
        setDocType,
        researchBundle,
        setResearchBundle,
        outline,
        setOutline,
        finalSections,
        setFinalSections,
        font,
        setFont,
        totalPages,
        setTotalPages,
        color,
        setColor,
        audienceContext,
        setAudienceContext,
        customChapterCount,
        setCustomChapterCount,
        isInitialized,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocumentContext() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocumentContext must be used within a DocumentProvider");
  }
  return context;
}
