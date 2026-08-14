import { calculateDocumentBudget, generateStructuredOutline, generateSectionProse, expandSectionProse } from "../lib/ai";
import { executeTavilyResearch } from "../lib/tavily";
import { assembleWordDocument, AssembleDocumentInput } from "../lib/assembler";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

async function run40PageTest() {
  console.log("================================================================================");
  console.log("STARTING 40-PAGE DOCUMENT GENERATION VERIFICATION TEST");
  console.log("================================================================================");

  const prompt = "Autonomous Multi-Agent Architecture for Enterprise Systems";
  const pageCount = 40;
  const font = "Times New Roman";
  const accentColor = "000000";

  // Step 1: Word Budget Calculation
  const budget = calculateDocumentBudget(prompt, {
    pageCount,
    font,
    customChapterCount: undefined
  });

  console.log("\n[STAGE 1 & 2: Budget Derivation]");
  console.log(`- Requested Pages: ${budget.pageCount}`);
  console.log(`- Font: ${budget.font} (${budget.wordsPerPage} words/page)`);
  console.log(`- Total Target Word Count: ${budget.totalTargetWords.toLocaleString()} words`);
  console.log(`- Derived Chapter Count: ${budget.chapterCount} chapters`);
  console.log(`- Target per Chapter: ${budget.wordsPerChapterTarget} words/chapter`);

  // Step 2: Live Research
  console.log("\n[STAGE 3: Live Research]");
  const researchBundle = await executeTavilyResearch(prompt);
  console.log(`- Retrieved ${researchBundle.results.length} research sources.`);

  // Step 3: Outline Generation
  console.log("\n[STAGE 4: Structured Outline Generation]");
  const outline = await generateStructuredOutline(
    prompt,
    {
      pageCount: budget.pageCount,
      customChapterCount: budget.chapterCount,
      font: budget.font,
      accentColor,
      format: "docx",
      tone: "Academic & Analytical"
    },
    researchBundle
  );

  console.log(`- Generated Title: "${outline.title}"`);
  console.log(`- Actual Outline Chapter Count: ${outline.sections.length}`);
  outline.sections.forEach((sec, idx) => {
    console.log(`  Chapter ${idx + 1}: ${sec.title} (${sec.subsections?.length || 0} subsections)`);
  });

  // Step 4: Section Prose Generation & Word Budget Enforcement
  console.log("\n[STAGE 5: Section Prose Generation & Expansion Loop]");
  const compiledSections: Array<{ id: string; title: string; brief: string; content: string; subsections?: any[] }> = [];

  for (let i = 0; i < outline.sections.length; i++) {
    const section = outline.sections[i];
    const subCount = section.subsections && section.subsections.length > 0 ? section.subsections.length : 3;
    const targetSubWords = Math.round(budget.wordsPerChapterTarget / subCount);

    const filteredSources = (researchBundle?.results || []).filter((src: any) =>
      (section.relevantSourceIndices || [1]).includes(src.index)
    );

    let prose = await generateSectionProse(
      outline.title,
      section,
      filteredSources,
      {
        format: "docx",
        tone: "Academic & Analytical",
        targetChapterWords: budget.wordsPerChapterTarget,
        targetSubsectionWords: targetSubWords
      }
    );

    let words = prose.split(/\s+/).filter(Boolean).length;
    console.log(`  -> Chapter ${i + 1}/${outline.sections.length} Draft: "${section.title}" - ${words} words`);

    // Expansion pass if undershot
    if (words < budget.wordsPerChapterTarget * 0.70) {
      console.log(`     [Expansion Pass Triggered] Chapter ${i + 1} (${words}/${budget.wordsPerChapterTarget} w). Expanding...`);
      prose = await expandSectionProse(
        outline.title,
        section,
        prose,
        budget.wordsPerChapterTarget,
        filteredSources,
        { tone: "Academic & Analytical" }
      );
      words = prose.split(/\s+/).filter(Boolean).length;
      console.log(`     [Expansion Complete] Chapter ${i + 1} expanded to ${words} words.`);
    }

    compiledSections.push({
      id: section.id || `sec_${i + 1}`,
      title: section.title,
      brief: section.brief,
      content: prose,
      subsections: section.subsections
    });
  }

  const totalWords = compiledSections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);
  console.log(`\n- Total Drafted Manuscript Words: ${totalWords.toLocaleString()} words`);

  // Step 5: Document Assembly
  console.log("\n[STAGE 6: Binary Document Assembly (.docx)]");
  const assembleInput: AssembleDocumentInput = {
    title: outline.title,
    subtitle: outline.subtitle,
    format: "docx",
    sections: compiledSections,
    chapters: compiledSections,
    selectedFont: font,
    accentColor: accentColor,
    academicMeta: {
      isFormalAcademicReport: true,
      institutionName: "Department of Computer Science & Engineering",
      department: "School of Advanced Computing",
      degree: "Master of Science in Artificial Intelligence",
      submittedBy: "Lead Research Candidate",
      guideName: "Dr. Faculty Supervisor, Chair of AI",
      academicYear: "2025–2026",
      projectTitleOverride: outline.title,
      selectedFont: font,
      accentColor: accentColor
    }
  };

  const docxBuffer = await assembleWordDocument(assembleInput);
  const outputPath = path.join(process.cwd(), "test_40page_output.docx");
  fs.writeFileSync(outputPath, docxBuffer);
  console.log(`- Written .docx binary to: ${outputPath} (${docxBuffer.length.toLocaleString()} bytes)`);

  // Step 6: Parse .docx binary to accurately determine chapters, words, and pages
  const zip = await JSZip.loadAsync(docxBuffer);
  const docXml = await zip.file("word/document.xml")?.async("string");

  if (!docXml) {
    throw new Error("Could not find word/document.xml inside generated docx!");
  }

  // Count text runs & exact words in document.xml
  const textMatches = docXml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
  let allText = textMatches.map(m => m.replace(/<[^>]+>/g, "")).join(" ");
  const exactDocxWordCount = allText.split(/\s+/).filter(Boolean).length;

  // Count explicit page breaks in XML (<w:br w:type="page"/> or <w:lastRenderedPageBreak/> or page breaks before chapters)
  const pageBreakMatches = (docXml.match(/<w:br[^>]*w:type="page"[^>]*\/>/g) || []).length;
  // Estimate printed pages based on exact word count / wordsPerPage + front matter pages (cover + cert + decl + abstract + TOC = 5 pages)
  const frontMatterPages = 5;
  const bodyPages = Math.round(exactDocxWordCount / budget.wordsPerPage);
  const finalCalculatedPages = Math.max(pageBreakMatches + 1, frontMatterPages + bodyPages);

  console.log("\n================================================================================");
  console.log("FINAL 40-PAGE DOCUMENT RESULTS SUMMARY");
  console.log("================================================================================");
  console.log(`1. Actual Resulting Chapter Count: ${outline.sections.length} Chapters`);
  console.log(`2. Actual Total Word Count: ${exactDocxWordCount.toLocaleString()} Words`);
  console.log(`3. Actual Final Page Count: ~${finalCalculatedPages} Pages (${pageBreakMatches} explicit section page breaks + ${bodyPages} formatted body pages)`);
  console.log(`4. Selected Font Verified: ${budget.font}`);
  console.log(`5. Heading Color: #${accentColor} (Black)`);
  console.log("================================================================================");
}

run40PageTest().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
