import { NextRequest, NextResponse } from "next/server";
import { extractAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    if (filename.endsWith(".txt") || filename.endsWith(".md") || filename.endsWith(".json") || filename.endsWith(".csv")) {
      extractedText = buffer.toString("utf-8");
    } else {
      // Basic text extraction for uploaded files
      extractedText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    }

    if (extractedText.length > 20000) {
      extractedText = extractedText.slice(0, 20000) + "... [Truncated for optimal context window]";
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
