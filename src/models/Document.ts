import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface IDocumentSection {
  id: string;
  title: string;
  brief: string;
  keyPoints: string[];
  relevantSourceIndices: number[];
  content?: string;
  status: "pending" | "generating" | "completed";
}

export interface IResearchSource {
  index: number;
  title: string;
  url: string;
  score?: number;
  snippet: string;
}

export interface IDocument extends MongooseDocument {
  userId?: string;
  userEmail?: string;
  prompt: string;
  format: "docx" | "pptx" | "pdf";
  docType: string;
  tone: string;
  audience: string;
  targetLength: string;
  title: string;
  subtitle: string;
  researchSummary?: string;
  researchSources: IResearchSource[];
  outline: IDocumentSection[];
  status: "intake" | "researched" | "outline_approved" | "generating" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSectionSchema = new Schema<IDocumentSection>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  brief: { type: String, default: "" },
  keyPoints: [{ type: String }],
  relevantSourceIndices: [{ type: Number }],
  content: { type: String, default: "" },
  status: { type: String, enum: ["pending", "generating", "completed"], default: "completed" }
});

const ResearchSourceSchema = new Schema<IResearchSource>({
  index: { type: Number, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  score: { type: Number },
  snippet: { type: String, required: true }
});

const DocumentSchema = new Schema<IDocument>(
  {
    userId: { type: String, index: true },
    userEmail: { type: String, index: true },
    prompt: { type: String, required: true },
    format: { type: String, enum: ["docx", "pptx", "pdf"], default: "docx" },
    docType: { type: String, default: "Research Report" },
    tone: { type: String, default: "Academic & Analytical" },
    audience: { type: String, default: "General Academic" },
    targetLength: { type: String, default: "Detailed (~2,000 words)" },
    title: { type: String, default: "Untitled Document" },
    subtitle: { type: String, default: "" },
    researchSummary: { type: String, default: "" },
    researchSources: [ResearchSourceSchema],
    outline: [DocumentSectionSchema],
    status: {
      type: String,
      enum: ["intake", "researched", "outline_approved", "generating", "completed"],
      default: "intake"
    }
  },
  { timestamps: true }
);

export default mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema);
