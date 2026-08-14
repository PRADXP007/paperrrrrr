import {
  calculateDocumentBudget,
  buildDynamicOutline,
  generateSectionProse,
  expandSectionProse,
  filterDuplicateParagraphs,
  isNearDuplicateParagraph
} from "../lib/ai";
import { executeTavilyResearch } from "../lib/tavily";
import { assembleWordDocument } from "../lib/assembler";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

async function runGroundedVerification() {
  console.log("================================================================================");
  console.log("STARTING RESEARCH-GROUNDED GENERATION & WORD BUDGET VERIFICATION TEST");
  console.log("================================================================================\n");

  const prompt = "Strategic Analysis of Global Semiconductor Manufacturing & Supply Chain Resilience";
  const requestedPages = 20;
  const selectedFont = "Times New Roman";
  const accentColor = "000000";

  // 1. Calculate Document Budget
  const docBudget = calculateDocumentBudget(prompt, {
    pageCount: requestedPages,
    font: selectedFont
  });

  console.log("[STAGE 1: Budget System Invocation]");
  console.log(`- Requested Pages: ${docBudget.pageCount}`);
  console.log(`- Font: ${docBudget.font} (${docBudget.wordsPerPage} words/page)`);
  console.log(`- Total Target Word Count: ${docBudget.totalTargetWords.toLocaleString()} words`);
  console.log(`- Calculated Chapter Count: ${docBudget.chapterCount} chapters`);
  console.log(`- Per-Section Target Budget: ${docBudget.wordsPerChapterTarget} words/chapter\n`);

  // 2. Primary Grounded Research
  console.log("[STAGE 2: Grounded Live Research]");
  const primaryResearch = await executeTavilyResearch(prompt, { depth: "standard" });
  console.log(`- Retrieved ${primaryResearch.results.length} initial research sources.\n`);

  // 3. Dynamic Outline Generation
  console.log("[STAGE 3: Structured Outline Framing]");
  const outline = buildDynamicOutline(prompt, {
    format: "docx",
    docType: "Research Report",
    pageCount: requestedPages,
    font: selectedFont
  }, primaryResearch);

  console.log(`- Outline Title: "${outline.title}"`);
  console.log(`- Generated Outline Chapters: ${outline.sections.length}`);
  outline.sections.forEach((sec, idx) => {
    console.log(`  Chapter ${idx + 1}: ${sec.title} (${sec.subsections?.length || 0} subsections)`);
  });
  console.log("");

  // 4. Section Generation & Grounded Targeted Expansion
  console.log("[STAGE 4: Grounded Section Drafting & Targeted Expansion Pass]");
  let compiledSections: any[] = [];
  const fabricationTriggers = [
    "42.8% reduction in latency variance",
    "3.4x throughput multiplier",
    "p < 0.001",
    "Fault Isolation Latency",
    "320 ms | 42 ms",
    "Multi-Agent Convergence Rate"
  ];

  let fabricationDetectedCount = 0;

  for (let i = 0; i < outline.sections.length; i++) {
    const sec = outline.sections[i];
    const filteredSources = primaryResearch.results.filter((src: any) =>
      (sec.relevantSourceIndices || [1]).includes(src.index)
    );

    // Initial Section Drafting
    let prose = await generateSectionProse(
      outline.title,
      sec,
      filteredSources.length > 0 ? filteredSources : primaryResearch.results,
      {
        targetChapterWords: docBudget.wordsPerChapterTarget,
        targetSubsectionWords: Math.round(docBudget.wordsPerChapterTarget / (sec.subsections?.length || 3)),
        format: "docx",
        docType: "Research Report",
        tone: "Academic & Analytical"
      }
    );

    const initialWords = prose.split(/\s+/).filter(Boolean).length;
    console.log(`  -> Chapter ${i + 1}/${outline.sections.length} Drafted: "${sec.title}" — Initial: ${initialWords} words (Target: ${docBudget.wordsPerChapterTarget} w)`);

    // Targeted Research Expansion if short
    if (initialWords < docBudget.wordsPerChapterTarget * 0.75) {
      console.log(`     [Targeted Expansion] Retrieving fresh grounded research for "${sec.title}"...`);
      const targetedQuery = `${outline.title} ${sec.title} ${sec.brief}`.slice(0, 200);
      const expansionBundle = await executeTavilyResearch(targetedQuery, { depth: "standard" });
      console.log(`     [Targeted Expansion] Retrieved ${expansionBundle.results.length} fresh sources. Expanding prose...`);

      prose = await expandSectionProse(
        outline.title,
        sec,
        prose,
        docBudget.wordsPerChapterTarget,
        expansionBundle.results.length > 0 ? expansionBundle.results : filteredSources
      );

      const expandedWords = prose.split(/\s+/).filter(Boolean).length;
      console.log(`     [Targeted Expansion] Complete. New length: ${expandedWords} words (+${expandedWords - initialWords} words).`);
    }

    // Check for hardcoded / fabricated string triggers
    for (const trigger of fabricationTriggers) {
      if (prose.includes(trigger)) {
        console.error(`     ❌ FABRICATION DETECTED in Chapter ${i + 1}: Found "${trigger}"!`);
        fabricationDetectedCount++;
      }
    }

    compiledSections.push({
      id: sec.id,
      title: sec.title,
      brief: sec.brief,
      content: prose,
      subsections: sec.subsections
    });
  }

  console.log(`\n- Fabrication Trigger Check: ${fabricationDetectedCount === 0 ? "PASSED (0 fabrications detected)" : `FAILED (${fabricationDetectedCount} detected)`}`);

  // 5. Anti-Duplication Filtering
  console.log("\n[STAGE 5: Deduplication & Near-Duplicate Paragraph Audit]");
  const preFilterWords = compiledSections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);
  compiledSections = filterDuplicateParagraphs(compiledSections);
  const postFilterWords = compiledSections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);
  console.log(`- Pre-dedup total words: ${preFilterWords}`);
  console.log(`- Post-dedup total words: ${postFilterWords}`);
  console.log(`- Deduplication filtered ${preFilterWords - postFilterWords} redundant words.`);

  // 6. Binary Document Assembly
  console.log("\n[STAGE 6: Binary OpenXML Assembly (.docx)]");
  const docxBuffer = await assembleWordDocument({
    title: outline.title,
    subtitle: outline.subtitle,
    format: "docx",
    selectedFont,
    accentColor,
    sections: compiledSections
  });

  const outputPath = path.join(process.cwd(), "test_grounded_output.docx");
  fs.writeFileSync(outputPath, docxBuffer);
  console.log(`- Written .docx binary to: ${outputPath} (${docxBuffer.length.toLocaleString()} bytes)`);

  // 7. Verify OpenXML Word Count & Real Page Breakdown
  const zip = await JSZip.loadAsync(docxBuffer);
  const docXml = await zip.file("word/document.xml")?.async("string");
  let realWordCount = 0;
  if (docXml) {
    const textMatches = docXml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
    const allExtractedText = textMatches.map(t => t.replace(/<[^>]+>/g, "")).join(" ");
    realWordCount = allExtractedText.split(/\s+/).filter(Boolean).length;
  }

  const derivedPages = Math.ceil(realWordCount / docBudget.wordsPerPage);

  console.log("\n================================================================================");
  console.log("FINAL GROUNDED VERIFICATION REPORT");
  console.log("================================================================================");
  console.log(`1. Requested Target: ${requestedPages} Pages (~${docBudget.totalTargetWords.toLocaleString()} Words)`);
  console.log(`2. Chapter Count Produced: ${compiledSections.length} Chapters`);
  console.log(`3. Total Extracted Word Count: ${realWordCount.toLocaleString()} Words`);
  console.log(`4. Calculated Final Page Count: ~${derivedPages + 2} Pages (Front Matter + Body)`);
  console.log(`5. Fabricated Boilerplate Found: ${fabricationDetectedCount} instances (0 required)`);
  console.log(`6. Typography Font Applied: ${selectedFont}`);
  console.log(`7. Heading Color: #${accentColor}`);
  console.log("================================================================================\n");
}

runGroundedVerification().catch(console.error);
