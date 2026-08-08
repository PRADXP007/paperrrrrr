import { NextRequest, NextResponse } from "next/server";
import { generateStructuredOutline } from "@/lib/ai";
import { connectToDatabase } from "@/lib/mongodb";
import Document from "@/models/Document";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { docId, prompt, options, researchBundle } = body;

    const outline = await generateStructuredOutline(prompt, options || {}, researchBundle);

    if (docId) {
      try {
        await connectToDatabase();
        await (Document as any).findByIdAndUpdate(docId, {
          title: outline.title,
          subtitle: outline.subtitle,
          outline: outline.sections.map((s: any) => ({ ...s, status: "pending", content: "" })),
          status: "outline_approved"
        });
      } catch (dbErr) {
        console.warn("MongoDB document update skipped:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      outline
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Outline generation failed" }, { status: 500 });
  }
}
