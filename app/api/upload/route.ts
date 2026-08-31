import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import * as pdfParseModule from "pdf-parse";
import mammoth from "mammoth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfParseAny = pdfParseModule as any;
    const PDFParseClass = pdfParseAny.PDFParse || pdfParseAny.default?.PDFParse;
    if (typeof PDFParseClass === "function") {
      const parser = new PDFParseClass({ data: buffer });
      const res = await parser.getText();
      return (typeof res === "string" ? res : res?.text || "").trim();
    }
    const parseFn = typeof pdfParseAny === "function" ? pdfParseAny : pdfParseAny.default;
    if (typeof parseFn === "function") {
      const res = await parseFn(buffer);
      return (res?.text || "").trim();
    }
  } catch (err) {
    console.warn("PDF extraction error:", err);
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`upload:${ip}`, { limit: 15, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${rateLimit.resetInSeconds}s before uploading more files.` },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename = file.name || "uploaded_file";
    const lowerName = filename.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    if (lowerName.endsWith(".pdf")) {
      extractedText = await extractTextFromPdf(buffer);
      if (!extractedText) {
        extractedText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
      }
    } else if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
      try {
        const docxResult = await mammoth.extractRawText({ buffer });
        extractedText = (docxResult.value || "").trim();
      } catch (docxErr: any) {
        console.warn("DOCX parsing failed, falling back to text stream extraction:", docxErr);
        extractedText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
      }
    } else if (
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".md") ||
      lowerName.endsWith(".json") ||
      lowerName.endsWith(".csv") ||
      lowerName.endsWith(".rtf")
    ) {
      extractedText = buffer.toString("utf-8");
    } else {
      // General fallback text extraction
      extractedText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    }

    // Clean up excessive whitespace
    extractedText = extractedText.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    if (extractedText.length > 25000) {
      extractedText = extractedText.slice(0, 25000) + "... [Truncated for optimal context window]";
    }

    return NextResponse.json({
      success: true,
      filename,
      size: file.size,
      extractedLength: extractedText.length,
      extractedText
    });
  } catch (err: any) {
    console.error("File upload extraction error:", err);
    return NextResponse.json({ error: err.message || "Failed to process uploaded file" }, { status: 500 });
  }
}

