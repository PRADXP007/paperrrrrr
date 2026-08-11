import { NextRequest, NextResponse } from "next/server";
import { executeTavilyResearch } from "@/lib/tavily";
import { generateStructuredOutline, generateSectionProse } from "@/lib/ai";
import { connectToDatabase } from "@/lib/mongodb";
import { extractAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import Document from "@/models/Document";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Max execution for Vercel Serverless

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`stream:${ip}`, { limit: 12, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${rateLimit.resetInSeconds}s before initiating another live stream.` },
        { status: 429 }
      );
    }

    const authUser = await extractAuthUser(req);
    const body = await req.json();
    const {
      prompt,
      format = "docx",
      tone = "Academic & Analytical",
      audience = "Students & Researchers",
      targetLength = "Detailed (~2,000 words)",
      docType = "Research Report",
      docId: incomingDocId,
      approvedOutline,
      referenceNotes,
      customGeminiKey,
      customOpenAIKey,
      geminiModel = "gemini-3.6-flash"
    } = body;

    if (!prompt && !approvedOutline) {
      return NextResponse.json({ error: "Prompt or approved outline is required" }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(data: Record<string, any>) {
          const payload = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }

        try {
          let researchBundle = body.researchBundle;
          let outline = approvedOutline;
          let docId = incomingDocId;

          // STEP 1: Research (if not already done)
          if (!researchBundle) {
            sendEvent({
              type: "status",
              step: "research_start",
              message: "Initiating live web research via Tavily Search..."
            });

            researchBundle = await executeTavilyResearch(prompt);

            sendEvent({
              type: "research_done",
              researchBundle,
              message: `Retrieved ${researchBundle.results.length} live research sources.`
            });
          }

          // Save / Create initial document record in DB if connected
          try {
            await connectToDatabase();
            if (!docId) {
              const doc = await (Document as any).create({
                userId: authUser?.id || undefined,
                userEmail: authUser?.email || undefined,
                prompt: prompt || outline?.title || "Document",
                format,
                tone,
                audience,
                targetLength,
                docType,
                title: outline?.title || (prompt ? prompt.charAt(0).toUpperCase() + prompt.slice(1) : "Document"),
                researchSummary: researchBundle?.answer || "",
                researchSources: researchBundle?.results || [],
                status: "researched"
              });
              docId = doc._id.toString();
            }
          } catch (dbErr) {
            console.warn("MongoDB initial save skipped in stream:", dbErr);
          }

          // STEP 2: Outline Generation (if not already provided)
          if (!outline) {
            sendEvent({
              type: "status",
              step: "outline_start",
              message: `Structuring JSON outline with Google Gemini (${geminiModel})...`
            });

            outline = await generateStructuredOutline(
              prompt,
              { format, tone, audience, targetLength, docType, referenceNotes, customGeminiKey, customOpenAIKey, geminiModel },
              researchBundle
            );

            sendEvent({
              type: "outline_done",
              outline,
              docId,
              message: `Structured outline framed with ${outline.sections.length} core sections.`
            });

            try {
              if (docId) {
                await (Document as any).findByIdAndUpdate(docId, {
                  title: outline.title,
                  subtitle: outline.subtitle,
                  outline: outline.sections.map((s: any) => ({ ...s, status: "pending", content: "" })),
                  status: "outline_approved"
                });
              }
            } catch (dbErr) {
              console.warn("MongoDB outline update skipped:", dbErr);
            }
          }

          // STEP 3: Section-by-Section Prose Drafting with Real-time Events
          const sections = outline.sections || [];
          const compiledSections: Array<{ id: string; title: string; brief: string; content: string }> = [];

          console.log(`[Stream Pipeline] Initiating prose generation for ${sections.length} approved sections using ${geminiModel}...`);

          for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const normSectionId = section.id || `sec_${i + 1}`;

            console.log(`[Stream Pipeline] -> Section ${i + 1}/${sections.length} STARTED: "${section.title}" (ID: ${normSectionId})`);

            sendEvent({
              type: "status",
              step: "section_start",
              index: i,
              total: sections.length,
              sectionId: normSectionId,
              title: section.title,
              message: `Drafting Section ${i + 1} of ${sections.length}: "${section.title}"...`
            });

            const filteredSources = (researchBundle?.results || []).filter((src: any) =>
              (section.relevantSourceIndices || [1]).includes(src.index)
            );

            const startTime = Date.now();
            let prose = "";

            try {
              prose = await generateSectionProse(
                outline.title,
                section,
                filteredSources,
                { customGeminiKey, customOpenAIKey, geminiModel, docType, tone, referenceNotes, format, targetLength }
              );
            } catch (sectionErr: any) {
              console.error(`[Stream Pipeline] ❌ Error drafting Section ${i + 1} ("${section.title}"):`, sectionErr);
              prose = `[Generation Notice: Section "${section.title}" encountered a processing latency error. Focus: ${section.brief}]`;
            }

            const duration = Date.now() - startTime;
            console.log(`[Stream Pipeline] ✓ Section ${i + 1}/${sections.length} COMPLETED in ${duration}ms (${prose.length} chars). Emitting section_done SSE event.`);

            compiledSections.push({
              id: normSectionId,
              title: section.title,
              brief: section.brief,
              content: prose
            });

            sendEvent({
              type: "section_done",
              id: normSectionId,
              index: i,
              total: sections.length,
              title: section.title,
              brief: section.brief,
              content: prose,
              message: `Section ${i + 1} ("${section.title}") completed.`
            });

            // Update MongoDB section status incrementally
            try {
              if (docId) {
                await (Document as any).updateOne(
                  { _id: docId, "outline.id": normSectionId },
                  {
                    $set: {
                      "outline.$.content": prose,
                      "outline.$.status": "completed"
                    }
                  }
                );
              }
            } catch (dbErr) {
              console.warn("MongoDB section prose update skipped:", dbErr);
            }
          }

          // STEP 4: Assembled and Completed
          sendEvent({
            type: "status",
            step: "assembling",
            message: `Finalizing ${format.toUpperCase()} document metadata & formatting...`
          });

          sendEvent({
            type: "complete",
            docId,
            title: outline.title,
            subtitle: outline.subtitle,
            format,
            sections: compiledSections,
            message: "Generation complete. Ready for instant download."
          });

          controller.close();
        } catch (err: any) {
          sendEvent({
            type: "error",
            error: err.message || "An unexpected error occurred during streaming."
          });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to initialize stream" }, { status: 500 });
  }
}
