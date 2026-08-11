import { NextRequest, NextResponse } from "next/server";
import { generateSectionProse, regenerateSingleSection } from "@/lib/ai";
import { connectToDatabase } from "@/lib/mongodb";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import Document from "@/models/Document";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`section:${ip}`, { limit: 25, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${rateLimit.resetInSeconds}s before refining more sections.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      docId,
      docTitle,
      section,
      filteredSources = [],
      userInstruction,
      customGeminiKey,
      customOpenAIKey,
      geminiModel = "gemini-3.6-flash"
    } = body;

    if (!section || !section.id) {
      return NextResponse.json({ error: "Invalid section payload" }, { status: 400 });
    }

    let content = "";
    if (userInstruction && userInstruction.trim() !== "") {
      content = await regenerateSingleSection(
        docTitle || "Untitled Document",
        section,
        filteredSources,
        userInstruction,
        { customGeminiKey, customOpenAIKey, geminiModel }
      );
    } else {
      content = await generateSectionProse(
        docTitle || "Untitled Document",
        section,
        filteredSources,
        { customGeminiKey, customOpenAIKey, geminiModel }
      );
    }

    if (docId) {
      try {
        const db = await connectToDatabase();
        if (db) {
          await (Document as any).updateOne(
            { _id: docId, "outline.id": section.id },
            {
              $set: {
                "outline.$.content": content,
                "outline.$.status": "completed"
              }
            }
          );
        }
      } catch (dbErr) {
        console.warn("MongoDB section update skipped:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      sectionId: section.id,
      content
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Section generation failed" }, { status: 500 });
  }
}
