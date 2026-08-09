import { NextRequest, NextResponse } from "next/server";
import { executeTavilyResearch } from "@/lib/tavily";
import { connectToDatabase } from "@/lib/mongodb";
import Document from "@/models/Document";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      format = "docx",
      tone = "Academic",
      audience = "Students",
      targetLength = "Detailed",
      depth = "standard",
      referenceNotes
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const researchBundle = await executeTavilyResearch(prompt, { depth });

    let docId = null;
    try {
      await connectToDatabase();
      const doc = await (Document as any).create({
        prompt,
        format,
        tone,
        audience,
        targetLength,
        title: prompt.charAt(0).toUpperCase() + prompt.slice(1),
        researchSummary: researchBundle.answer || "",
        researchSources: researchBundle.results,
        status: "researched"
      });
      docId = doc._id.toString();
    } catch (dbErr) {
      console.warn("MongoDB document save skipped:", dbErr);
    }

    return NextResponse.json({
      success: true,
      docId,
      researchBundle
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Research failed" }, { status: 500 });
  }
}
