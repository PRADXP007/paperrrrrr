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

export async function assembleIEEEWordDocument(input: AssembleDocumentInput): Promise<Buffer> {
  const safeTitle = input.settings?.projectTitleOverride || input.settings.title || "Research Paper Title";
  const rawSections = input.sections || input.sections || [];
  const meta = input.settings || {};
  const selectedFont = meta.selectedFont || input.settings.selectedFont || "Times New Roman";
  const headingColor = (meta.accentColor || input.settings.accentColor || "000000").replace("#", "");

  // Extract Abstract & Keywords or synthesize
  let abstractText = "";
  let keywordsText = "component, formatting, style, empirical analysis, neural architecture, IEEE standards";

  const contentSections: DocumentSection[] = [];
  rawSections.forEach((sec) => {
    const tLower = sec.title.toLowerCase();
    if (tLower.includes("abstract") || tLower.includes("executive summary")) {
      abstractText = cleanMarkdownFormatting(sec.content || sec.brief || "");
    } else if (tLower.includes("keyword")) {
      keywordsText = cleanMarkdownFormatting(sec.content || sec.brief || "");
    } else if (!tLower.includes("references") && !tLower.includes("bibliography")) {
      contentSections.push(sec);
    }
  });

  if (!abstractText) {
    abstractText = `This paper presents a rigorous empirical and architectural inquiry into ${safeTitle}. By analyzing quantitative benchmarks, system formulations, and comparative baselines, we establish an integrated framework that addresses core operational bottlenecks. Experimental evaluations demonstrate significant efficiency and scalability advantages over traditional paradigms.`;
  }

  // Section 1: Single-Column Title & Author Affiliations Block
  const headerChildren: any[] = [];

  // IEEE Header Notice
  headerChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "XXX-X-XXXX-XXXX-X/XX/$XX.00 ©20XX IEEE",
          font: selectedFont,
          size: 16, // 8pt
          color: "555555"
        })
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 180 }
    })
  );

  // Paper Title (24pt Regular/Bold Centered)
  headerChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: safeTitle,
          bold: true,
          font: selectedFont,
          size: 48, // 24pt
          color: headingColor
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 }
    })
  );

  // Note on subtitles
  headerChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "*Note: Sub-titles are not captured in Xplore and should not be used",
          italics: true,
          font: selectedFont,
          size: 18, // 9pt
          color: "666666"
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 }
    })
  );

  // Author Affiliation Grid (3-column Table)
  const author1Name = meta.submittedBy || input.settings.author || "1st Given Name Surname";
  const author2Name = meta.guideName || "2nd Given Name Surname";
  const author3Name = "3rd Given Name Surname";
  const deptName = meta.department || "dept. name of organization";
  const orgName = meta.institutionName || "name of organization";

  const authorsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: author1Name, font: selectedFont, size: 20, bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: deptName, font: selectedFont, size: 18, italics: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: `(of Affiliation)\n${orgName}`, font: selectedFont, size: 18, italics: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "City, Country", font: selectedFont, size: 18 })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "email address or ORCID", font: selectedFont, size: 18 })], alignment: AlignmentType.CENTER })
            ],
            width: { size: 33, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: author2Name, font: selectedFont, size: 20, bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: deptName, font: selectedFont, size: 18, italics: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: `(of Affiliation)\n${orgName}`, font: selectedFont, size: 18, italics: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "City, Country", font: selectedFont, size: 18 })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "email address or ORCID", font: selectedFont, size: 18 })], alignment: AlignmentType.CENTER })
            ],
            width: { size: 34, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: author3Name, font: selectedFont, size: 20, bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: deptName, font: selectedFont, size: 18, italics: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: `(of Affiliation)\n${orgName}`, font: selectedFont, size: 18, italics: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "City, Country", font: selectedFont, size: 18 })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "email address or ORCID", font: selectedFont, size: 18 })], alignment: AlignmentType.CENTER })
            ],
            width: { size: 33, type: WidthType.PERCENTAGE }
          })
        ]
      })
    ]
  });

  headerChildren.push(authorsTable);

  // Spacing after author block
  headerChildren.push(
    new Paragraph({ spacing: { after: 240 } })
  );

  // Abstract Paragraph (Bold Italic Abstract— run-in)
  headerChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Abstract—",
          bold: true,
          italics: true,
          font: selectedFont,
          size: 19 // 9.5pt
        }),
        new TextRun({
          text: abstractText.replace(/^Abstract[—\-:\s]*/i, ""),
          bold: true,
          font: selectedFont,
          size: 19 // 9.5pt
        })
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 140, line: 240 }
    })
  );

  // Keywords Paragraph (Bold Italic Keywords— run-in)
  headerChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Keywords—",
          bold: true,
          italics: true,
          font: selectedFont,
          size: 19 // 9.5pt
        }),
        new TextRun({
          text: keywordsText.replace(/^Keywords[—\-:\s]*/i, ""),
          italics: true,
          font: selectedFont,
          size: 19 // 9.5pt
        })
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 280, line: 240 }
    })
  );

  // Section 2: 2-Column Body Content
  const bodyChildren: any[] = [];

  for (const [idx, sec] of contentSections.entries()) {
    const rawTitle = sec.title.replace(/^\d+\.\s*/, "").replace(/^Slide \d+:\s*/, "");
    const roman = toRomanNumeral(idx + 1);
    const heading1Text = `${roman}. ${rawTitle.toUpperCase()}`;

    // Heading 1: Roman Numeral, Centered / Small Caps, 10pt Bold
    bodyChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: heading1Text,
            bold: true,
            font: selectedFont,
            size: 20, // 10pt Bold
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 }
      })
    );

    // Section Content
    let secBody = sec.content || sec.brief || "";
    secBody = await preprocessVisualElements(secBody, sec.title);
    const parsedElements = parseIEEEParagraphsToDocx(secBody, selectedFont, headingColor);
    bodyChildren.push(...parsedElements);

    // Detect and embed visual diagrams (flowcharts/charts)
    try {
      const diagrams = await detectAndCreateDiagramsForSection(sec.title, secBody);
      for (const diag of diagrams) {
        const targetW = 310;
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
            spacing: { before: 160, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: diag.caption,
                italics: true,
                font: selectedFont,
                size: 17, // 8.5pt
                color: "000000"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 }
          })
        );
      }
    } catch (diagErr) {
      console.warn("IEEE diagram generation skipped:", diagErr);
    }
  }

  // Acknowledgment Section
  bodyChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "ACKNOWLEDGMENT",
          bold: true,
          font: selectedFont,
          size: 20,
          color: headingColor
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `The authors would like to thank ${meta.institutionName || "the institutional laboratory and faculty mentors"} for providing computational infrastructure and technical support during this research inquiry.`,
          font: selectedFont,
          size: 19
        })
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 160, line: 240 }
    })
  );

  // References Section
  const bibliography = extractBibliography(rawSections, safeTitle);
  bodyChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "REFERENCES",
          bold: true,
          font: selectedFont,
          size: 20,
          color: headingColor
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 }
    })
  );

  bibliography.forEach((refStr, rIdx) => {
    const formattedRef = refStr.startsWith("[") ? refStr : `[${rIdx + 1}]  ${refStr}`;
    bodyChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: formattedRef,
            font: selectedFont,
            size: 17 // 8.5pt
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) },
        spacing: { after: 80, line: 220 }
      })
    );
  });

  // Build Word Document with Continuous 2-Column Section
  const doc = new DocxDocument({
    styles: {
      default: {
        document: {
          run: {
            font: selectedFont,
            size: 20 // 10pt
          }
        }
      }
    },
    sections: [
      // Section 1: Single column (Header, Title, Authors, Abstract)
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(1.0),
              left: convertInchesToTwip(0.625),
              right: convertInchesToTwip(0.625)
            }
          }
        },
        children: headerChildren
      },
      // Section 2: Two-column body
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(1.0),
              left: convertInchesToTwip(0.625),
              right: convertInchesToTwip(0.625)
            }
          },
          column: {
            count: 2,
            space: 720 // 0.5" gap between columns
          }
        },
        children: bodyChildren
      }
    ]
  });

  return await Packer.toBuffer(doc);
}

// 1. Word Document (.docx) Assembler - Multi-Chapter Academic & Corporate Thesis Standard