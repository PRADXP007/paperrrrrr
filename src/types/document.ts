export interface DocumentSettings {
  // Core Identifiers
  title: string;
  subtitle?: string;
  author?: string;

  // Generation & Format
  format: "docx" | "pptx" | "pdf";
  docType?: string;          // e.g., "Academic Report", "Business Plan", "Presentation"
  reportCategory?: string;   // e.g., "School", "College", "Engineering", "Corporate"
  isIEEEPaper?: boolean;
  tone?: string;
  pageCount?: number;
  chapterCount?: number;

  // Visuals
  selectedFont: string;
  accentColor: string;

  institutionName?: string;
  department?: string;
  degree?: string;
  submittedBy?: string;
  guideName?: string;
  academicYear?: string;
  projectTitleOverride?: string;

  // AI & Generation Specific
  targetLength?: string;
  customGeminiKey?: string;
  geminiModel?: string;
  referenceNotes?: string;
  additionalRequirements?: string;
  [key: string]: any;
}

export interface DocumentSubsection {
  id?: string;
  title: string;
  brief?: string;
  keyPoints?: string[];
  content?: string;
}

export interface DocumentSection {
  id?: string;
  title: string;
  brief?: string;
  content: string;
  keyPoints?: string[];
  subsections?: DocumentSubsection[];
}

export interface AssembleDocumentInput {
  settings: DocumentSettings;
  sections: DocumentSection[];
}
