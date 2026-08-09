import { NextRequest, NextResponse } from "next/server";
import { generateSectionProse, regenerateSingleSection } from "@/lib/ai";
import { connectToDatabase } from "@/lib/mongodb";
import Document from "@/models/Document";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      docId,
      docTitle,
      section,
      filteredSources = [],
      userInstruction,
      customGeminiKey,
      customOpenAIKey
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
        { customGeminiKey, customOpenAIKey }
      );
    } else {
      content = await generateSectionProse(
        docTitle || "Untitled Document",
        section,
        filteredSources,
        { customGeminiKey, customOpenAIKey }
      );
    }

    if (docId) {
      try {
        await connectToDatabase();
        await (Document as any).updateOne(
          { _id: docId, "outline.id": section.id },
          {
            $set: {
              "outline.$.content": content,
              "outline.$.status": "completed"
            }
          }
        );
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
