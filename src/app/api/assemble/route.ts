import { NextRequest } from "next/server";
import { generateDocument } from "@/lib/assemblers";
import { AssembleDocumentInput } from "@/types/document";
import { connectToDatabase } from "@/lib/mongodb";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import Document from "@/models/Document";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req as any);
    const rateLimit = checkRateLimit(`assemble:${ip}`, { limit: 15, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: `Rate limit exceeded. Please wait ${rateLimit.resetInSeconds}s before generating again.` }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const docId = body.docId;
    
    // Backwards compatibility layer to construct valid DocumentSettings if UI still sends old flat structure
    const title = body.title || body.settings?.title || "Document";
    const subtitle = body.subtitle || body.settings?.subtitle || "Comprehensive Academic & Project Report";
    const format = body.format || body.settings?.format || "docx";
    const reportCategory = body.reportCategory || body.academicMeta?.reportCategory || body.settings?.reportCategory;
    const isIEEEPaper = body.isIEEEPaper || body.docType === "Research Paper" || body.docType === "IEEE Research Paper" || body.settings?.isIEEEPaper;
    const selectedFont = body.selectedFont || body.academicMeta?.selectedFont || body.settings?.selectedFont || "Times New Roman";
    const accentColor = body.accentColor || body.academicMeta?.accentColor || body.settings?.accentColor || "000000";
    
    const sections = body.sections || body.chapters || [];
    
    const assembleInput: AssembleDocumentInput = {
      settings: {
        title,
        subtitle,
        format,
        docType: body.docType || body.settings?.docType,
        reportCategory,
        isIEEEPaper,
        selectedFont,
        accentColor,
        ...body.academicMeta,
        ...body.settings
      },
      sections: Array.isArray(sections) && sections.length > 0 
        ? sections 
        : [{ title: "1. Introduction & Overview", brief: "Document summary", content: "Prepared with Paperrrrrr Document Studio." }]
    };

    const fileBuffer = await generateDocument(assembleInput);
    
    let contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    let fileExtension = format;
    if (format === "pptx") contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    if (format === "pdf") contentType = "application/pdf";

    if (docId) {
      try {
        const db = await connectToDatabase();
        if (db) {
          await (Document as any).findByIdAndUpdate(docId, { status: "completed" });
        }
      } catch (dbErr) {
        console.warn("MongoDB status update skipped:", dbErr);
      }
    }

    const safeFilenameTitle = (assembleInput.settings.projectTitleOverride || title).replace(/[^a-zA-Z0-9_\-]/g, "_");
    const filename = `Paperrrrrr_${safeFilenameTitle}.${fileExtension}`;

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString()
      }
    });
  } catch (error: any) {
    console.error("Document assembly route error:", error);
    return new Response(JSON.stringify({ error: error.message || "Document assembly failed", stack: error.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}