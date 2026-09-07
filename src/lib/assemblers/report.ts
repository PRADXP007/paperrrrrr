import { AssembleDocumentInput, DocumentSection } from "@/types/document";
import { 
  toRomanNumeral, 
  parseParagraphsToDocx, 
  parseIEEEParagraphsToDocx, 
  isMarkdownTable, 
  parseMarkdownTableToDocx, 
  cleanMarkdownFormatting, 
  preprocessVisualElements,
  extractBibliography
} from "./utils";
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  TabStopType,
  LeaderType,
  NumberFormat,
  Table,
  TableRow,
  TableCell,
  WidthType,
  SectionType
} from "docx";
import pptxgen from "pptxgenjs";
import PDFDocument from "pdfkit";
import { detectAndCreateDiagramsForSection, renderMermaidToPngBuffer } from "../diagrams";
import { tavily } from "@tavily/core";

export async function assembleWordDocument(
  input: AssembleDocumentInput
): Promise<Buffer> {
  const safeTitle = input.settings.title.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
  const safeSubtitle = input.settings.subtitle ? input.settings.subtitle.replace(/[^a-zA-Z0-9\s-]/g, "").trim() : "";
  
  const reportCategory = input.settings.reportCategory || "College";
  const rawSections = input.sections || [];
  const isFormal = reportCategory === "Engineering";
  const selectedFont = input.settings.selectedFont || "Times New Roman";
  const headingColor = (input.settings.accentColor || "000000").replace("#", "");
  const meta = input.settings;

  // Filter out any sections that are named "References" or "Bibliography"
  const contentSections = rawSections.filter(s => {
    const t = s.title.toLowerCase();
    return !t.includes("references") && !t.includes("bibliography") && !t.includes("cited literature");
  });

  // Synthesize a comprehensive abstract paragraph from content
  const abstractSummary = contentSections.length > 0
    ? `This academic project report presents an exhaustive empirical and theoretical inquiry into ${safeTitle}. Through systematic methodological benchmarking, architectural modeling, and institutional case evaluations across core domains, this study synthesizes foundational principles, quantitative findings, and actionable execution roadmaps. The resulting taxonomy and benchmark data provide scholars, faculty, and industry practitioners with an authoritative framework for technical evaluation, risk governance, and future research over the upcoming decade.`
    : `This comprehensive analytical report presents structured research findings, empirical baseline indicators, and actionable strategic roadmaps on ${safeTitle}.`;

  // =========================================================================
  // SECTION 1: FRONT MATTER (Cover Page, Certificate, Declaration, Acknowledgement, Abstract, Table of Contents)
  // Page numbers: Lowercase Roman numerals (ii, iii, iv, v...), Cover Page unnumbered
  // =========================================================================
  const frontMatterChildren: any[] = [];
  let frontMatterRomanPage = 1; // 1 = cover (unnumbered)

  // 1. Cover Page
  if (reportCategory === "School") {
    frontMatterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: safeTitle.toUpperCase(),
            bold: true,
            font: selectedFont,
            size: 40, 
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 2400, after: 1200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Student Name: " + (meta.submittedBy || "___________________") + "\n", font: selectedFont, size: 28, color: "000000" }),
          new TextRun({ text: "Class/Grade: " + (meta.degree || "___________________") + "\n", font: selectedFont, size: 28, color: "000000" }),
          new TextRun({ text: "Subject: " + (meta.department || "___________________") + "\n", font: selectedFont, size: 28, color: "000000" }),
          new TextRun({ text: "School: " + (meta.institutionName || "___________________") + "\n", font: selectedFont, size: 28, color: "000000" }),
          new TextRun({ text: "Date: " + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), font: selectedFont, size: 28, color: "000000" })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120, line: 400 }
      })
    );
  } else if (reportCategory === "Corporate") {
    frontMatterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: (meta.institutionName || "Company Name").toUpperCase(),
            bold: true,
            font: selectedFont,
            size: 32, 
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1000, after: 1800 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: safeTitle.toUpperCase(),
            bold: true,
            font: selectedFont,
            size: 40,
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Prepared For:\n", bold: true, font: selectedFont, size: 24, color: "000000" }),
          new TextRun({ text: (meta.guideName || "Client / Executive Team") + "\n", font: selectedFont, size: 24, color: "000000" })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Prepared By:\n", bold: true, font: selectedFont, size: 24, color: "000000" }),
          new TextRun({ text: (meta.submittedBy || "Project Team") + "\n", font: selectedFont, size: 24, color: "000000" })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
            bold: true,
            font: selectedFont,
            size: 24,
            color: "000000"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );
  } else if (isFormal) {
    // Formal University / Engineering Report Cover Page
    frontMatterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: (meta.institutionName || "").toUpperCase(),
            bold: true,
            font: selectedFont,
            size: 32,
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1000, after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: meta.department || "Department of Computer Science & Engineering",
            font: selectedFont,
            size: 26,
            color: "000000"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1800 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: safeTitle.toUpperCase(),
            bold: true,
            font: selectedFont,
            size: 40,
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "A PROJECT REPORT",
            bold: true,
            font: selectedFont,
            size: 28,
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Submitted in partial fulfillment of the requirements for the award of the degree of",
            italics: true,
            font: selectedFont,
            size: 24,
            color: "000000"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: (meta.degree || "BACHELOR OF TECHNOLOGY").toUpperCase(),
            bold: true,
            font: selectedFont,
            size: 28,
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1600 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Submitted by:\n", bold: true, font: selectedFont, size: 24, color: "000000" }),
          new TextRun({ text: meta.submittedBy || "Student Investigator", font: selectedFont, size: 24, color: "000000" })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Under the guidance of:\n", bold: true, font: selectedFont, size: 24, color: "000000" }),
          new TextRun({ text: meta.guideName || "Faculty Supervisor", font: selectedFont, size: 24, color: "000000" })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: meta.academicYear || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" }).toUpperCase(),
            bold: true,
            font: selectedFont,
            size: 24,
            color: "000000"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );
  } else {
    // College Standard Cover Page
    frontMatterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: safeTitle.toUpperCase(),
            bold: true,
            font: selectedFont,
            size: 40,
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 2400, after: 360 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: safeSubtitle,
            font: selectedFont,
            size: 28,
            color: "000000"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 3600 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Generated by Paperrrrrr",
            font: selectedFont,
            size: 24,
            color: "000000"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
            font: selectedFont,
            size: 24,
            color: "000000"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 720 }
      })
    );
  }

  // 2. Certificate Page (Conditional)
  let certPageRoman = "";
  if (isFormal) {
    frontMatterRomanPage++;
    certPageRoman = toRomanNumeral(frontMatterRomanPage).toLowerCase();
    frontMatterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "BONAFIDE CERTIFICATE",
            bold: true,
            font: selectedFont,
            size: 32, // 16pt Bold
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        pageBreakBefore: true,
        spacing: { before: 720, after: 720 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Certified that this project report entitled "${safeTitle.toUpperCase()}" is the bonafide work of ${meta.submittedBy || "the candidate(s)"} who carried out the research work under my supervision in partial fulfillment of the requirements for the award of the degree of ${meta.degree || "Bachelor of Technology"} at ${meta.institutionName || "the Institution"}.`,
            font: selectedFont,
            size: 24,
            color: "000000"
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 3600, line: 360 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "SIGNATURE\t\t\t\t\t\t\tSIGNATURE\n", bold: true, font: selectedFont, size: 24, color: "000000" }),
          new TextRun({ text: `${meta.guideName || "Supervisor Name"}\t\t\t\t\t\t\tHead of the Department\n`, bold: true, font: selectedFont, size: 24, color: "000000" }),
          new TextRun({ text: `SUPERVISOR\t\t\t\t\t\t\t${(meta.department || "Department").toUpperCase()}`, font: selectedFont, size: 22, color: "000000" })
        ],
        alignment: AlignmentType.LEFT,
        spacing: { after: 720 }
      })
    );
  }

  // 3. Declaration Page (Conditional)
  let declPageRoman = "";
  if (isFormal) {
    frontMatterRomanPage++;
    declPageRoman = toRomanNumeral(frontMatterRomanPage).toLowerCase();
    frontMatterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "DECLARATION",
            bold: true,
            font: selectedFont,
            size: 32, // 16pt Bold
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        pageBreakBefore: true,
        spacing: { before: 720, after: 720 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `I/We hereby declare that the project report entitled "${safeTitle.toUpperCase()}" submitted to ${meta.institutionName || "the Institution"} in partial fulfillment of the requirements for the award of the degree of ${meta.degree || "Bachelor of Technology"} is a record of original research work done by me/us under the guidance of ${meta.guideName || "the supervisor"}.`,
            font: selectedFont,
            size: 24,
            color: "000000"
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 720, line: 360 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `This project report has not been submitted in part or full to any other University or Institution for the award of any degree or diploma.`,
            font: selectedFont,
            size: 24,
            color: "000000"
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 3600, line: 360 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Place: ______________\t\t\t\t\t\t${meta.submittedBy || "Signature of Candidate(s)"}\n`, font: selectedFont, size: 24, color: "000000" }),
          new TextRun({ text: `Date:  ______________`, font: selectedFont, size: 24, color: "000000" })
        ],
        alignment: AlignmentType.LEFT,
        spacing: { after: 720 }
      })
    );
  }

  // 4. Acknowledgement Page (Conditional)
  let ackPageRoman = "";
  if (isFormal) {
    frontMatterRomanPage++;
    ackPageRoman = toRomanNumeral(frontMatterRomanPage).toLowerCase();
    frontMatterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "ACKNOWLEDGEMENT",
            bold: true,
            font: selectedFont,
            size: 32, // 16pt Bold
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        pageBreakBefore: true,
        spacing: { before: 720, after: 720 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `I/We express our profound gratitude to our esteemed guide, ${meta.guideName || "our supervisor"}, for the invaluable guidance, constant encouragement, and insightful feedback rendered throughout the course of this research project.`,
            font: selectedFont,
            size: 24,
            color: "000000"
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 360, line: 360 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `We also extend our sincere thanks to the Head of the Department and all faculty members of the ${meta.department || "Department"} at ${meta.institutionName || "our Institution"} for providing the necessary facilities and computational infrastructure to successfully complete this project.`,
            font: selectedFont,
            size: 24,
            color: "000000"
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 360, line: 360 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Finally, we thank our parents and peers whose constant moral support and assistance made this endeavor possible.`,
            font: selectedFont,
            size: 24,
            color: "000000"
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 2400, line: 360 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: meta.submittedBy || "Candidate(s)", bold: true, font: selectedFont, size: 24, color: "000000" })
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 720 }
      })
    );
  }

  // 5. Abstract Page / Executive Summary (Conditional)
  let abstractRomanPage = "";
  if (reportCategory !== "School") {
    frontMatterRomanPage++;
    abstractRomanPage = toRomanNumeral(frontMatterRomanPage).toLowerCase();
    frontMatterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: reportCategory === "Corporate" ? "EXECUTIVE SUMMARY" : "ABSTRACT",
            bold: true,
            font: selectedFont,
            size: 32, // 16pt Bold
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        pageBreakBefore: true,
        spacing: { before: 720, after: 480 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: abstractSummary,
            font: selectedFont,
            size: 24, // 12pt
            color: "000000"
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 240, line: 360 } // 1.5 line spacing
      })
    );
  }

  // 6. Table of Contents Page (Lowercase Roman Numeral)
  const tocEntries: Array<{ label: string; page: string; isSubsection?: boolean }> = [];
  
  if (isFormal) {
    if (certPageRoman) tocEntries.push({ label: "Certificate", page: certPageRoman });
    if (declPageRoman) tocEntries.push({ label: "Declaration", page: declPageRoman });
    if (ackPageRoman) tocEntries.push({ label: "Acknowledgement", page: ackPageRoman });
  }

  if (abstractRomanPage) {
    tocEntries.push({ label: reportCategory === "Corporate" ? "Executive Summary" : "Abstract", page: abstractRomanPage });
  }

  // Calculate nested decimal page numbers for each chapter and its subsections
  let runningPageNumber = 1;

  contentSections.forEach((sec, idx) => {
    const chapterNum = idx + 1;
    const cleanChapterTitle = sec.title.replace(/^\d+\.\s*/, "").trim();
    const chapterStartPage = runningPageNumber;

    tocEntries.push({
      label: `${chapterNum}. ${cleanChapterTitle}`,
      page: chapterStartPage.toString()
    });

    // Subsections in Table of Contents
    const rawContent = sec.content || sec.brief || "";
    const hasExplicitSubs = sec.subsections && sec.subsections.length > 0;

    let subIndex = 1;
    if (hasExplicitSubs) {
      sec.subsections!.forEach((sub) => {
        const cleanSubTitle = sub.title.replace(/^\d+\.\d+\s*/, "").trim();
        tocEntries.push({
          label: `    ${chapterNum}.${subIndex} ${cleanSubTitle}`,
          page: runningPageNumber.toString(),
          isSubsection: true
        });
        const subWords = ((sub.content || "") + " " + (sub.brief || "")).split(/\s+/).filter(Boolean).length;
        const subPages = Math.max(0, Math.floor(subWords / 280));
        runningPageNumber += subPages;
        subIndex++;
      });
    } else {
      // Parse markdown ### subheadings from raw content if present
      const markdownSubs = rawContent.match(/^###\s+([^\n]+)/gm) || [];
      if (markdownSubs.length > 0) {
        markdownSubs.forEach((subLine) => {
          const rawSubTitle = subLine.replace(/^###\s+/, "").replace(/^\d+\.\d+\s*/, "").trim();
          tocEntries.push({
            label: `    ${chapterNum}.${subIndex} ${rawSubTitle}`,
            page: runningPageNumber.toString(),
            isSubsection: true
          });
          subIndex++;
        });
      }
    }

    const secWords = rawContent.split(/\s+/).filter(Boolean).length;
    const secPages = Math.max(1, Math.ceil(secWords / 280));
    runningPageNumber = chapterStartPage + secPages;
  });

  tocEntries.push({ label: "CONCLUSION", page: runningPageNumber.toString() });
  runningPageNumber += 1;
  tocEntries.push({ label: "REFERENCES", page: runningPageNumber.toString() });

  let renderTOC = true;
  if (reportCategory === "School") {
    renderTOC = false; // Generally no TOC for short school assignments
  }
  
  if (renderTOC) {
    frontMatterRomanPage++;
    frontMatterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "TABLE OF CONTENTS",
          bold: true,
          font: selectedFont,
          size: 32, // 16pt Bold
          color: headingColor
        })
      ],
      alignment: AlignmentType.CENTER,
      pageBreakBefore: true,
      spacing: { before: 720, after: 480 }
    })
  );

  tocEntries.forEach(entry => {
    frontMatterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: entry.label,
            bold: !entry.isSubsection,
            font: selectedFont,
            size: entry.isSubsection ? 22 : 24, // 11pt for subs, 12pt for chapters
            color: entry.isSubsection ? "000000" : headingColor
          }),
          new TextRun({
            text: "\t",
            font: selectedFont,
            size: 24,
            color: "000000"
          }),
          new TextRun({
            text: entry.page,
            bold: !entry.isSubsection,
            font: selectedFont,
            size: 24,
            color: "000000"
          })
        ],
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: convertInchesToTwip(6.5), // Right margin for standard 8.5" page with 1" margins
            leader: LeaderType.DOT
          }
        ],
        spacing: { before: entry.isSubsection ? 60 : 120, after: entry.isSubsection ? 60 : 120, line: 360 }
      })
    );
  });

  // =========================================================================
  } // End of renderTOC
  
  // SECTION 2: BODY & BACK MATTER (Chapters 1..N with Nested Subsections, Conclusion, References)
  // Page numbers: Arabic numerals (1, 2, 3...) starting at Chapter 1
  // =========================================================================
  const bodyChildren: any[] = [];

  // Chapters (1 through N)
  for (const [idx, sec] of contentSections.entries()) {
    const chapterNum = idx + 1;
    const cleanChapterTitle = sec.title.replace(/^\d+\.\s*/, "").trim();

    // Chapter Heading: "1. Introduction" (Centered, Bold, 15pt)
    bodyChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: `${chapterNum}. ${cleanChapterTitle}`,
            bold: true,
            font: selectedFont,
            size: 30, // 15pt Bold
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        pageBreakBefore: true,
        spacing: { before: 480, after: 200 }
      })
    );

    // Chapter overview / brief if present
    if (sec.brief && sec.brief.trim() !== cleanChapterTitle) {
      bodyChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cleanMarkdownFormatting(sec.brief),
              italics: true,
              font: selectedFont,
              size: 24,
              color: "000000"
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 360 }
        })
      );
    }

    // Check if section has full generated content or fallback to subsection briefs
    let rawContent = sec.content || "";
    if (rawContent && rawContent.trim().length > 0) {
      rawContent = await preprocessVisualElements(rawContent, sec.title);
      const contentBlocks = rawContent.split("\n\n").map(b => b.trim()).filter(Boolean);

      for (const block of contentBlocks) {
        if (isMarkdownTable(block)) {
          try {
            const docxTable = parseMarkdownTableToDocx(block, selectedFont);
            bodyChildren.push(docxTable);
            bodyChildren.push(new Paragraph({ spacing: { after: 200 } }));
            continue;
          } catch (tableErr) {
            console.warn("Table parse fallback:", tableErr);
          }
        }

        const blockParagraphs = parseParagraphsToDocx(block, chapterNum, selectedFont, headingColor);
        bodyChildren.push(...blockParagraphs);
      }
    } else if (sec.subsections && sec.subsections.length > 0) {
      for (const [subIdx, sub] of sec.subsections.entries()) {
        const subNumber = `${chapterNum}.${subIdx + 1}`;
        const cleanSubTitle = sub.title.replace(/^\d+\.\d+\s*/, "").trim();

        // Subsection Heading: "1.1 Background and Motivation" (Left-aligned, Bold, 13pt)
        bodyChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: `${subNumber} ${cleanSubTitle}`,
                bold: true,
                font: selectedFont,
                size: 26, // 13pt Bold
                color: headingColor
              })
            ],
            alignment: AlignmentType.LEFT,
            spacing: { before: 280, after: 120 }
          })
        );

        let subRaw = sub.content || sub.brief || "";
        subRaw = await preprocessVisualElements(subRaw, sub.title);
        const subParagraphs = parseParagraphsToDocx(subRaw, chapterNum, selectedFont, headingColor);
        bodyChildren.push(...subParagraphs);
      }
    }

    // Detect and embed visual diagrams (flowcharts/charts) for this chapter
    try {
      const diagrams = await detectAndCreateDiagramsForSection(sec.title, rawContent);
      for (const diag of diagrams) {
        const targetW = 520;
        const targetH = Math.round((diag.height / diag.width) * targetW);
        bodyChildren.push(
          new Paragraph({
            children: [
              new ImageRun({
                type: "png",
                data: diag.pngBuffer,
                transformation: {
                  width: targetW,
                  height: targetH
                }
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 80 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: diag.caption,
                italics: true,
                font: selectedFont,
                size: 20, // 10pt
                color: "000000"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          })
        );
      }
    } catch (diagErr) {
      console.warn("Diagram generation skipped for chapter:", diagErr);
    }
  }

  // Conclusion (Centered, Bold, 16pt)
  bodyChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "CONCLUSION",
          bold: true,
          font: selectedFont,
          size: 32, // 16pt Bold
          color: headingColor
        })
      ],
      alignment: AlignmentType.CENTER,
      pageBreakBefore: true,
      spacing: { before: 720, after: 480 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `In synthesis, the empirical evidence, theoretical frameworks, and operational architectures established throughout this project report confirm that ${safeTitle} represents a vital inflection point in contemporary domain research. By harmonizing rigorous methodology with scalable implementations, institutional stakeholders can realize significant operational yield while maintaining stringent governance and risk mitigation protocols.`,
          font: selectedFont,
          size: 24,
          color: "000000"
        })
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 240, line: 360 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Future research investigations should focus on long-term empirical dataset replication, cross-platform protocol interoperability, and automated governance monitoring to ensure sustained academic relevance and operational excellence.`,
          font: selectedFont,
          size: 24,
          color: "000000"
        })
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 360, line: 360 }
    })
  );

  // References (Centered, Bold, 16pt)
  const referencesList = extractBibliography(rawSections, safeTitle);

  bodyChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "REFERENCES",
          bold: true,
          font: selectedFont,
          size: 32, // 16pt Bold
          color: headingColor
        })
      ],
      alignment: AlignmentType.CENTER,
      pageBreakBefore: true,
      spacing: { before: 720, after: 480 }
    })
  );

  referencesList.forEach(refText => {
    bodyChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: refText,
            font: selectedFont,
            size: 24, // 12pt
            color: "000000"
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.5) }, // Hanging indent
        spacing: { after: 180, line: 360 }
      })
    );
  });

  // Construct Final Docx Document with Two Independent Sections
  const doc = new DocxDocument({
    creator: "Paperrrrrr Document Studio",
    title: safeTitle,
    styles: {
      default: {
        document: {
          run: { font: selectedFont, color: "000000", size: 24 }
        }
      }
    },
    sections: [
      // SECTION 1: FRONT MATTER (Cover, Certificate, Declaration, Acknowledgement, Abstract, Table of Contents)
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            },
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.LOWER_ROMAN
            }
          },
          titlePage: true // Suppress footer on cover page
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: selectedFont,
                    size: 24, // 12pt
                    color: "000000"
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ]
          })
        },
        children: frontMatterChildren
      },

      // SECTION 2: BODY & BACK MATTER (Chapters 1..N with Subsections, Conclusion, References)
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            },
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL // Arabic numerals (1, 2, 3...) restarting at 1
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: safeTitle.toUpperCase(),
                    font: selectedFont,
                    size: 18, // 9pt
                    color: "000000"
                  })
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { after: 120 }
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: selectedFont,
                    size: 20, // 10pt
                    color: "000000"
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 120 }
              })
            ]
          })
        },
        children: bodyChildren
      }
    ]
  });

  return await Packer.toBuffer(doc);
}

// 2. PowerPoint (.pptx) Modern Multi-Layout Presentation Assembler
export interface PPTXThemePalette {
  name: string;
  darkBg: string;
  cardDarkBg: string;
  lightBg: string;
  cardLightBg: string;
  cardBorder: string;
  primary: string;
  secondary: string;
  accent: string;
  textDark: string;
  textMuted: string;
  textLight: string;
  textLightMuted: string;
  headerFont: string;
  bodyFont: string;
}

const PPTX_PALETTES: Record<string, PPTXThemePalette> = {
  midnight: {
    name: "Midnight Executive",
    darkBg: "0F172A",
    cardDarkBg: "1E293B",
    lightBg: "FFFFFF",
    cardLightBg: "F8FAFC",
    cardBorder: "E2E8F0",
    primary: "1E2761",
    secondary: "3B82F6",
    accent: "38BDF8",
    textDark: "0F172A",
    textMuted: "64748B",
    textLight: "FFFFFF",
    textLightMuted: "94A3B8",
    headerFont: "Cambria",
    bodyFont: "Calibri"
  },
  teal: {
    name: "Teal Trust & Tech",
    darkBg: "064E3B",
    cardDarkBg: "065F46",
    lightBg: "FFFFFF",
    cardLightBg: "F0FDFA",
    cardBorder: "CCFBF1",
    primary: "028090",
    secondary: "00A896",
    accent: "02C39A",
    textDark: "0F172A",
    textMuted: "52525B",
    textLight: "FFFFFF",
    textLightMuted: "A7F3D0",
    headerFont: "Cambria",
    bodyFont: "Calibri"
  },
  terracotta: {
    name: "Warm Terracotta",
    darkBg: "292524",
    cardDarkBg: "44403C",
    lightBg: "FFFFFF",
    cardLightBg: "FAF9F6",
    cardBorder: "E7E5E4",
    primary: "B85042",
    secondary: "D97706",
    accent: "A7BEAE",
    textDark: "1C1917",
    textMuted: "78716C",
    textLight: "FFFFFF",
    textLightMuted: "D6D3D1",
    headerFont: "Cambria",
    bodyFont: "Calibri"
  },
  ocean: {
    name: "Ocean Gradient",
    darkBg: "0B192C",
    cardDarkBg: "1E3E62",
    lightBg: "FFFFFF",
    cardLightBg: "F0F9FF",
    cardBorder: "BAE6FD",
    primary: "065A82",
    secondary: "1C7293",
    accent: "0284C7",
    textDark: "0F172A",
    textMuted: "64748B",
    textLight: "FFFFFF",
    textLightMuted: "7DD3FC",
    headerFont: "Cambria",
    bodyFont: "Calibri"
  }
};

function selectPPTXPalette(title: string, accentColor?: string): PPTXThemePalette {
  const lower = (title + " " + (accentColor || "")).toLowerCase();
  if (lower.includes("green") || lower.includes("forest") || lower.includes("eco") || lower.includes("sustain") || lower.includes("teal") || lower.includes("energy")) {
    return PPTX_PALETTES.teal;
  }
  if (lower.includes("terracotta") || lower.includes("warm") || lower.includes("heritage") || lower.includes("legal") || lower.includes("culture")) {
    return PPTX_PALETTES.terracotta;
  }
  if (lower.includes("ocean") || lower.includes("sea") || lower.includes("water") || lower.includes("cloud") || lower.includes("fintech")) {
    return PPTX_PALETTES.ocean;
  }
  return PPTX_PALETTES.midnight;
}
