import { NextRequest, NextResponse } from "next/server";
import { executeTavilyResearch } from "@/lib/tavily";
import { connectToDatabase } from "@/lib/mongodb";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import Document from "@/models/Document";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`research:${ip}`, { limit: 20, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${rateLimit.resetInSeconds}s before initiating more research queries.` },
        { status: 429 }
      );
    }

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
      const db = await connectToDatabase();
      if (db) {
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
      }
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
