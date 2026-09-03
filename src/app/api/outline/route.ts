import { NextRequest, NextResponse } from "next/server";
import { generateStructuredOutline } from "@/lib/ai";
import { connectToDatabase } from "@/lib/mongodb";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import Document from "@/models/Document";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`outline:${ip}`, { limit: 20, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${rateLimit.resetInSeconds}s before requesting outlines.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { docId, prompt, options = {}, researchBundle, reportCategory, font, totalPages, color, customChapterCount, additionalInstructions, customGeminiKey } = body;

    const mergedOptions = {
      ...options,
      reportCategory: reportCategory,
      font: font,
      pageCount: totalPages,
      accentColor: color,
      customChapterCount: customChapterCount,
      additionalRequirements: additionalInstructions,
      customGeminiKey: customGeminiKey
    };

    const outline = await generateStructuredOutline(prompt, mergedOptions, researchBundle);

    if (docId) {
      try {
        const db = await connectToDatabase();
        if (db) {
          await (Document as any).findByIdAndUpdate(docId, {
            title: outline.title,
            subtitle: outline.subtitle,
            outline: outline.sections.map((s: any) => ({ ...s, status: "pending", content: "" })),
            status: "outline_approved"
          });
        }
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