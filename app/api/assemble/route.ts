import { NextRequest, NextResponse } from "next/server";
import {
  assembleWordDocument,
  assemblePowerPoint,
  assembleExcelSheet,
  assemblePdfDocument,
  AssembleDocumentInput
} from "@/lib/assembler";
import { connectToDatabase } from "@/lib/mongodb";
import Document from "@/models/Document";

export async function POST(req: NextRequest) {
  try {
    const body: AssembleDocumentInput & { docId?: string } = await req.json();
    const { title, subtitle, format = "docx", sections, docId } = body;

    let fileBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    const safeTitle = (title || "Document").replace(/[^a-zA-Z0-9_\-]/g, "_");

    switch (format) {
      case "pptx":
        fileBuffer = await assemblePowerPoint({ title, subtitle, format, sections });
        contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        fileExtension = "pptx";
        break;
      case "xlsx":
        fileBuffer = await assembleExcelSheet({ title, subtitle, format, sections });
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        fileExtension = "xlsx";
        break;
      case "pdf":
        fileBuffer = await assemblePdfDocument({ title, subtitle, format, sections });
        contentType = "application/pdf";
        fileExtension = "pdf";
        break;
      case "docx":
      default:
        fileBuffer = await assembleWordDocument({ title, subtitle, format, sections });
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        fileExtension = "docx";
        break;
    }

    if (docId) {
      try {
        await connectToDatabase();
        await (Document as any).findByIdAndUpdate(docId, { status: "completed" });
      } catch (dbErr) {
        console.warn("MongoDB status update skipped:", dbErr);
      }
    }

    const filename = `Paperrrrrr_${safeTitle}.${fileExtension}`;

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Document assembly failed" }, { status: 500 });
  }
}
