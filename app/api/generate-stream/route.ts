import { NextRequest, NextResponse } from "next/server";
import { executeTavilyResearch } from "@/lib/tavily";
import { generateStructuredOutline, generateSectionProse, calculateDocumentBudget, expandSectionProse, filterDuplicateParagraphs } from "@/lib/ai";
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
      pageCount,
      customChapterCount,
      font = "Times New Roman",
      accentColor = "000000",
      additionalRequirements,
      customGeminiKey,
      customOpenAIKey,
      geminiModel = "gemini-3.6-flash"
    } = body;

    if (!prompt && !approvedOutline) {
      return NextResponse.json({ error: "Prompt or approved outline is required" }, { status: 400 });
    }

    const docBudget = calculateDocumentBudget(prompt, {
      pageCount,
      customChapterCount,
      font,
      targetLength
    });

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
            const db = await connectToDatabase();
            if (db && !docId) {
              const doc = await (Document as any).create({
                userId: authUser?.id || undefined,
                userEmail: authUser?.email || undefined,
                prompt: prompt || outline?.title || "Document",
                format,
                tone,
                audience,
                targetLength: docBudget.label,
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
              message: `Structuring ${docBudget.chapterCount}-chapter outline with Google Gemini (${geminiModel})...`
            });

            outline = await generateStructuredOutline(
              prompt,
              {
                format,
                tone,
                audience,
                targetLength: docBudget.label,
                docType,
                referenceNotes,
                pageCount: docBudget.pageCount,
                customChapterCount: docBudget.chapterCount,
                font: docBudget.font,
                accentColor,
                additionalRequirements,
                customGeminiKey,
                customOpenAIKey,
                geminiModel
              },
              researchBundle
            );

            sendEvent({
              type: "outline_done",
              outline,
              docId,
              budget: docBudget,
              message: `Structured outline framed with ${outline.sections.length} core chapters (Target: ~${docBudget.totalTargetWords.toLocaleString()} words across ${docBudget.pageCount} pages).`
            });

            try {
              const db = await connectToDatabase();
              if (db && docId) {
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

          // STEP 3: Section-by-Section Prose Drafting with Real-time Events & Budget Enforcement
          const sections = outline.sections || [];
          let compiledSections: Array<{ id: string; title: string; brief: string; content: string; subsections?: any[] }> = [];

          console.log(`[Stream Pipeline] Initiating prose generation for ${sections.length} approved sections (Budget: ~${docBudget.wordsPerChapterTarget} words/chapter)...`);

          for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const normSectionId = section.id || `sec_${i + 1}`;
            const subCount = section.subsections && section.subsections.length > 0 ? section.subsections.length : 3;
            const targetSubWords = Math.round(docBudget.wordsPerChapterTarget / subCount);

            console.log(`[Stream Pipeline] -> Section ${i + 1}/${sections.length} STARTED: "${section.title}" (ID: ${normSectionId}) [Target: ~${docBudget.wordsPerChapterTarget} words]`);

            sendEvent({
              type: "status",
              step: "section_start",
              index: i,
              total: sections.length,
              sectionId: normSectionId,
              title: section.title,
              message: `Drafting Section ${i + 1} of ${sections.length}: "${section.title}" (Target: ~${docBudget.wordsPerChapterTarget} words)...`
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
                {
                  customGeminiKey,
                  customOpenAIKey,
                  geminiModel,
                  docType,
                  tone,
                  referenceNotes,
                  format,
                  targetLength: docBudget.label,
                  targetChapterWords: docBudget.wordsPerChapterTarget,
                  targetSubsectionWords: targetSubWords,
                  additionalRequirements
                }
              );

              // POST-GENERATION WORD COUNT CHECK & TARGETED EXPANSION PASS
              const initialWords = prose.split(/\s+/).filter(Boolean).length;
              if (initialWords < docBudget.wordsPerChapterTarget * 0.75 && (format === "docx" || format === "pdf")) {
                console.log(`[Stream Pipeline] Section ${i + 1} undershot word budget (${initialWords}/${docBudget.wordsPerChapterTarget} words). Running targeted research expansion...`);
                sendEvent({
                  type: "status",
                  step: "section_expanding",
                  index: i,
                  total: sections.length,
                  sectionId: normSectionId,
                  title: section.title,
                  message: `Enriching Section ${i + 1} ("${section.title}") with freshly grounded research to meet word target...`
                });

                let expansionSources: any[] = [];
                try {
                  const targetedQuery = `${outline.title} ${section.title} ${section.brief}`.slice(0, 200);
                  const expansionBundle = await executeTavilyResearch(targetedQuery, { depth: "standard" });
                  expansionSources = expansionBundle?.results || [];
                } catch (tavilyErr) {
                  console.warn("[Stream Pipeline] Targeted expansion research fallback:", tavilyErr);
                  expansionSources = filteredSources;
                }

                prose = await expandSectionProse(
                  outline.title,
                  section,
                  prose,
                  docBudget.wordsPerChapterTarget,
                  expansionSources.length > 0 ? expansionSources : filteredSources,
                  { customGeminiKey, customOpenAIKey, geminiModel, tone }
                );
              }
            } catch (sectionErr: any) {
              console.error(`[Stream Pipeline] ❌ Error drafting Section ${i + 1} ("${section.title}"):`, sectionErr);
              prose = `[Generation Notice: Section "${section.title}" encountered a processing latency error. Focus: ${section.brief}]`;
            }

            const finalWords = prose.split(/\s+/).filter(Boolean).length;
            const duration = Date.now() - startTime;
            console.log(`[Stream Pipeline] ✓ Section ${i + 1}/${sections.length} COMPLETED in ${duration}ms (${finalWords} words). Target was ${docBudget.wordsPerChapterTarget} words.`);

            compiledSections.push({
              id: normSectionId,
              title: section.title,
              brief: section.brief,
              content: prose,
              subsections: section.subsections
            });

            sendEvent({
              type: "section_done",
              id: normSectionId,
              index: i,
              total: sections.length,
              title: section.title,
              brief: section.brief,
              content: prose,
              wordCount: finalWords,
              subsections: section.subsections,
              message: `Section ${i + 1} ("${section.title}") completed (${finalWords} words).`
            });

            // Update MongoDB section status incrementally
            try {
              const db = await connectToDatabase();
              if (db && docId) {
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

          // STEP 4: Assembled and Completed (with Anti-Duplication Filtering)
          compiledSections = filterDuplicateParagraphs(compiledSections);
          const grandTotalWords = compiledSections.reduce((acc, s) => acc + (s.content ? s.content.split(/\s+/).filter(Boolean).length : 0), 0);

          sendEvent({
            type: "status",
            step: "assembling",
            message: `Finalizing ${format.toUpperCase()} manuscript (${grandTotalWords.toLocaleString()} total words, ~${docBudget.pageCount} pages)...`
          });

          sendEvent({
            type: "complete",
            docId,
            title: outline.title,
            subtitle: outline.subtitle,
            format,
            sections: compiledSections,
            totalWords: grandTotalWords,
            pageCount: docBudget.pageCount,
            font: docBudget.font,
            accentColor,
            message: `Generation complete. Manuscript rendered at ${grandTotalWords.toLocaleString()} words across ${compiledSections.length} chapters (~${docBudget.pageCount} pages).`
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
