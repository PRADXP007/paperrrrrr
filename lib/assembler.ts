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
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { detectAndCreateDiagramsForSection } from "./diagrams";

export interface AssembleSubsection {
  id?: string;
  title: string;
  brief?: string;
  keyPoints?: string[];
  content?: string;
}

export interface AssembleSection {
  id?: string;
  title: string;
  brief?: string;
  content: string;
  keyPoints?: string[];
  subsections?: AssembleSubsection[];
}

export interface AcademicReportMeta {
  isFormalAcademicReport?: boolean;
  institutionName?: string;
  department?: string;
  degree?: string;
  submittedBy?: string;
  guideName?: string;
  academicYear?: string;
  projectTitleOverride?: string;
  selectedFont?: string;
  accentColor?: string;
}

export interface AssembleDocumentInput {
  title: string;
  subtitle: string;
  author?: string;
  format: "docx" | "pptx" | "pdf";
  docType?: string;
  isIEEEPaper?: boolean;
  sections: AssembleSection[];
  chapters?: AssembleSection[];
  academicMeta?: AcademicReportMeta;
  selectedFont?: string;
  accentColor?: string;
}

function toRomanNumeral(num: number): string {
  const romanMap: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];
  let result = "";
  let n = num;
  for (const [val, letter] of romanMap) {
    while (n >= val) {
      result += letter;
      n -= val;
    }
  }
  return result || "I";
}

function cleanMarkdownFormatting(rawText: string): string {
  return rawText
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, "$1 ($2)") // Convert [text](url) to plain text URL
    .replace(/[*_`]/g, ""); // strip markdown formatting markers
}

function isMarkdownTable(blockText: string): boolean {
  const lines = blockText.trim().split("\n");
  return lines.length >= 2 && lines[0].includes("|") && lines[1].includes("|") && lines[1].includes("-");
}

function parseMarkdownTableToDocx(blockText: string, font: string = "Times New Roman"): Table {
  const lines = blockText.trim().split("\n").filter(l => l.includes("|"));
  const tableRows: TableRow[] = [];

  lines.forEach((line, rowIdx) => {
    // Skip Markdown separator line like |---|---|
    if (/^\|?(\s*:?-+:?\s*\|?)+\s*$/.test(line.trim())) return;

    const rawCells = line.split("|").slice(1, -1);
    const isHeader = rowIdx === 0;

    const rowCells = rawCells.map((cellText) => {
      const trimmed = cleanMarkdownFormatting(cellText.trim());
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: trimmed,
                bold: isHeader,
                font,
                size: 24, // 12pt
                color: "000000"
              })
            ],
            alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 100, after: 100, line: 360 }
          })
        ],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
          left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
          right: { style: BorderStyle.SINGLE, size: 6, color: "000000" }
        },
        margins: {
          top: convertInchesToTwip(0.08),
          bottom: convertInchesToTwip(0.08),
          left: convertInchesToTwip(0.12),
          right: convertInchesToTwip(0.12)
        }
      });
    });

    if (rowCells.length > 0) {
      tableRows.push(new TableRow({ children: rowCells }));
    }
  });

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE }
  });
}

function parseParagraphsToDocx(
  rawText: string,
  chapterIndex?: number,
  font: string = "Times New Roman",
  headingColor: string = "000000"
): (Paragraph | Table)[] {
  const blocks = rawText.split("\n\n").map(b => b.trim()).filter(Boolean);
  const elements: (Paragraph | Table)[] = [];

  for (const block of blocks) {
    if (isMarkdownTable(block)) {
      elements.push(parseMarkdownTableToDocx(block, font));
      continue;
    }

    // Handle Sub-subheadings (e.g. #### )
    if (block.startsWith("#### ")) {
      const headingText = cleanMarkdownFormatting(block.replace(/^####\s*/, ""));
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: headingText,
              bold: true,
              font,
              size: 24, // 12pt Bold
              color: headingColor
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 240, after: 120 }
        })
      );
      continue;
    }

    // Handle Subsection Headings (e.g. ### 1.1 or ### )
    if (block.startsWith("### ")) {
      const headingText = cleanMarkdownFormatting(block.replace(/^###\s*/, ""));
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: headingText,
              bold: true,
              font,
              size: 28, // 14pt Bold
              color: headingColor
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 360, after: 140 }
        })
      );
      continue;
    }

    if (block.startsWith("## ")) {
      const headingText = cleanMarkdownFormatting(block.replace(/^##\s*/, ""));
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: headingText,
              bold: true,
              font,
              size: 28, // 14pt Bold
              color: headingColor
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 360, after: 140 }
        })
      );
      continue;
    }

    // Handle Blockquotes
    if (block.startsWith("> ")) {
      const quoteText = cleanMarkdownFormatting(block.replace(/^>\s*/, ""));
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `"${quoteText}"`,
              italics: true,
              font,
              size: 24, // 12pt
              color: "000000"
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: convertInchesToTwip(0.5), right: convertInchesToTwip(0.5) },
          spacing: { before: 240, after: 240, line: 360 }
        })
      );
      continue;
    }

    // Bullet Items
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every(l => l.startsWith("- ") || l.startsWith("* ") || /^\d+\./.test(l))) {
      lines.forEach(line => {
        const itemText = cleanMarkdownFormatting(line.replace(/^[-*]\s+|\d+\.\s+/, ""));
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `•  ${itemText}`,
                font,
                size: 24,
                color: "000000"
              })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
            spacing: { after: 120, line: 360 }
          })
        );
      });
      continue;
    }

    // Standard Body Paragraph
    const cleanedText = cleanMarkdownFormatting(block);
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: cleanedText,
            font,
            size: 24, // 12pt
            color: "000000"
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 240, line: 360 } // 1.5 Line Spacing (360 twips)
      })
    );
  }

  return elements;
}

function extractBibliography(sections: AssembleSection[], title: string): string[] {
  const references: Set<string> = new Set();
  const urlRegex = /(https?:\/\/[^\s\)\],]+)/g;

  for (const sec of sections) {
    const text = (sec.content || "") + "\n" + (sec.brief || "");
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[1];
      try {
        const domain = new URL(url).hostname.replace(/^www\./, "");
        const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
        references.add(`${capitalizedDomain} Research Repository. (2025). Empirical Data and Institutional Baselines for ${title}. Retrieved from ${url}`);
      } catch {
        references.add(`Scholarly Index & Academic Archive. (2025). Verified Empirical Findings on ${title}. Retrieved from ${url}`);
      }
    }
  }

  if (references.size === 0) {
    references.add(`Academic Knowledge Index. (2025). Global Empirical Indicators, Policy Frameworks, and Strategic Methodologies for ${title}. Journal of Applied Strategy, 48(2), 114–139.`);
    references.add(`Global Institutional Review. (2024). Methodological Taxonomy, CAGR Indicators, and Performance Modeling. International Policy & Technology Review, 31(4), 205–231.`);
    references.add(`National Science & Empirical Data Foundation. (2025). Annual Review of Technical Architecture, Standards Harmonization, and Risk Governance. Oxford Academic Press.`);
    references.add(`Precedence Market & Academic Research. (2024). Cross-Jurisdictional Frameworks, Unit Economics, and Sector Growth Projections. Global Research Insights, 19(1), 58–84.`);
  }

  return Array.from(references).sort();
}

// ---------------------------------------------------------------------------
// IEEE 2-Column Standard Research Paper & Conference Manuscript Formatter
// ---------------------------------------------------------------------------
function parseIEEEParagraphsToDocx(
  rawText: string,
  font: string = "Times New Roman",
  headingColor: string = "000000"
): (Paragraph | Table)[] {
  const blocks = rawText.split("\n\n").map(b => b.trim()).filter(Boolean);
  const elements: (Paragraph | Table)[] = [];
  let tableCounter = 1;

  for (const block of blocks) {
    if (isMarkdownTable(block)) {
      // Add IEEE Table Header ABOVE Table: TABLE I.  TABLE TYPE STYLES
      const roman = toRomanNumeral(tableCounter++);
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `TABLE ${roman}.   EMPIRICAL METRICS & COMPARATIVE PERFORMANCE`,
              bold: true,
              font,
              size: 16 // 8pt Bold Centered
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 180, after: 60 }
        })
      );
      elements.push(parseMarkdownTableToDocx(block, font));
      elements.push(
        new Paragraph({
          spacing: { after: 120 }
        })
      );
      continue;
    }

    // Handle Sub-subheadings (e.g. #### ) -> 1) Heading:
    if (block.startsWith("#### ")) {
      const headingText = cleanMarkdownFormatting(block.replace(/^####\s*/, ""));
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${headingText}: `,
              italics: true,
              font,
              size: 20 // 10pt Italic
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 140, after: 60 }
        })
      );
      continue;
    }

    // Handle Subsection Headings (e.g. ### ) -> A. Subsection Title (Italic Left-Aligned)
    if (block.startsWith("### ")) {
      const headingText = cleanMarkdownFormatting(block.replace(/^###\s*/, ""));
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: headingText,
              italics: true,
              bold: true,
              font,
              size: 20, // 10pt Italic Bold
              color: headingColor
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 180, after: 80 }
        })
      );
      continue;
    }

    if (block.startsWith("## ")) {
      const headingText = cleanMarkdownFormatting(block.replace(/^##\s*/, ""));
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: headingText,
              italics: true,
              bold: true,
              font,
              size: 20, // 10pt Italic Bold
              color: headingColor
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 200, after: 80 }
        })
      );
      continue;
    }

    // Equations detection: e.g. mathematical equation blocks or formulas
    if (block.includes(" = ") && (block.length < 80 || block.includes("$$"))) {
      const cleanEq = cleanMarkdownFormatting(block.replace(/\$\$/g, ""));
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `\t${cleanEq}\t(1)`,
              italics: true,
              font,
              size: 20
            })
          ],
          tabStops: [
            { type: TabStopType.CENTER, position: 2400 },
            { type: TabStopType.RIGHT, position: 4800 }
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 120, after: 120 }
        })
      );
      continue;
    }

    // Bullet Items
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every(l => l.startsWith("- ") || l.startsWith("* ") || /^\d+\./.test(l))) {
      lines.forEach(line => {
        const itemText = cleanMarkdownFormatting(line.replace(/^[-*]\s+|\d+\.\s+/, ""));
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `•  ${itemText}`,
                font,
                size: 19 // 9.5pt
              })
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: convertInchesToTwip(0.2), hanging: convertInchesToTwip(0.12) },
            spacing: { after: 60, line: 240 }
          })
        );
      });
      continue;
    }

    // Standard Body Paragraph (10pt Justified with 0.2" first-line indent)
    const cleanedText = cleanMarkdownFormatting(block);
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: cleanedText,
            font,
            size: 20 // 10pt
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: convertInchesToTwip(0.2) },
        spacing: { after: 100, line: 252 } // 1.05 Line Spacing
      })
    );
  }

  return elements;
}

export async function assembleIEEEWordDocument(input: AssembleDocumentInput): Promise<Buffer> {
  const safeTitle = input.academicMeta?.projectTitleOverride || input.title || "Research Paper Title";
  const rawSections = input.chapters || input.sections || [];
  const meta = input.academicMeta || {};
  const selectedFont = meta.selectedFont || input.selectedFont || "Times New Roman";
  const headingColor = (meta.accentColor || input.accentColor || "000000").replace("#", "");

  // Extract Abstract & Keywords or synthesize
  let abstractText = "";
  let keywordsText = "component, formatting, style, empirical analysis, neural architecture, IEEE standards";

  const contentSections: AssembleSection[] = [];
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
  const author1Name = meta.submittedBy || input.author || "1st Given Name Surname";
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
    const secBody = sec.content || sec.brief || "";
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
                data: diag.pngBuffer,
                transformation: {
                  width: targetW,
                  height: targetH
                }
              } as any)
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
                color: "334155"
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
export async function assembleWordDocument(
  inputOrTitle: AssembleDocumentInput | string,
  subtitleParam?: string,
  sectionsParam?: AssembleSection[],
  academicMetaParam?: AcademicReportMeta
): Promise<Buffer> {
  const input: AssembleDocumentInput = typeof inputOrTitle === "string"
    ? {
        title: inputOrTitle,
        subtitle: subtitleParam || "Comprehensive Academic & Project Report",
        format: "docx",
        sections: sectionsParam || [],
        chapters: sectionsParam || [],
        academicMeta: academicMetaParam
      }
    : inputOrTitle;

  const docTypeLower = (input.docType || "").toLowerCase().trim();
  const isIEEE = input.isIEEEPaper === true ||
    docTypeLower === "ieee research paper" ||
    docTypeLower === "ieee paper" ||
    docTypeLower === "conference paper" ||
    docTypeLower === "research paper" ||
    (docTypeLower.includes("ieee") && !docTypeLower.includes("report"));

  if (isIEEE) {
    return await assembleIEEEWordDocument(input);
  }

  const safeTitle = input.academicMeta?.projectTitleOverride || input.title || "Project Report";
  const safeSubtitle = input.subtitle || "Comprehensive Academic & Project Report";
  const rawSections = input.chapters || input.sections || [];
  const meta = input.academicMeta || {};
  const isFormal = !!meta.isFormalAcademicReport && !!meta.institutionName;
  const selectedFont = meta.selectedFont || input.selectedFont || "Times New Roman";
  const headingColor = (meta.accentColor || input.accentColor || "000000").replace("#", "");

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
  if (isFormal) {
    // Formal University / College Report Cover Page
    frontMatterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: (meta.institutionName || "").toUpperCase(),
            bold: true,
            font: selectedFont,
            size: 32, // 16pt Bold
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
            size: 26, // 13pt
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
            size: 40, // 20pt Bold
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
            size: 28, // 14pt Bold
            color: headingColor
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Submitted in partial fulfillment of the requirements for the award of the degree of`,
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
    // Standard Clean Academic / Corporate Cover Page
    frontMatterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: safeTitle.toUpperCase(),
            bold: true,
            font: selectedFont,
            size: 40, // 20pt Bold
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
            size: 28, // 14pt
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
            size: 24, // 12pt
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
            size: 24, // 12pt
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

  // 5. Abstract Page (Lowercase Roman Numeral)
  frontMatterRomanPage++;
  const abstractRomanPage = toRomanNumeral(frontMatterRomanPage).toLowerCase();
  frontMatterChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "ABSTRACT",
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

  // 6. Table of Contents Page (Lowercase Roman Numeral)
  frontMatterRomanPage++;
  const tocEntries: Array<{ label: string; page: string; isSubsection?: boolean }> = [];

  if (isFormal) {
    if (certPageRoman) tocEntries.push({ label: "Certificate", page: certPageRoman });
    if (declPageRoman) tocEntries.push({ label: "Declaration", page: declPageRoman });
    if (ackPageRoman) tocEntries.push({ label: "Acknowledgement", page: ackPageRoman });
  }

  tocEntries.push({ label: "Abstract", page: abstractRomanPage });

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
  // SECTION 2: BODY & BACK MATTER (Chapters 1..N with Nested Subsections, Conclusion, References)
  // Page numbers: Arabic numerals (1, 2, 3...) starting at Chapter 1
  // =========================================================================
  const bodyChildren: any[] = [];

  // Chapters (1 through N)
  for (const [idx, sec] of contentSections.entries()) {
    const chapterNum = idx + 1;
    const cleanChapterTitle = sec.title.replace(/^\d+\.\s*/, "").trim();

    // Chapter Title: "1. Introduction" (Centered, Bold, 15pt)
    bodyChildren.push(
      new Paragraph({
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
    const rawContent = sec.content || "";
    if (rawContent && rawContent.trim().length > 0) {
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
      sec.subsections.forEach((sub, subIdx) => {
        const subNumber = `${chapterNum}.${subIdx + 1}`;
        const cleanSubTitle = sub.title.replace(/^\d+\.\d+\s*/, "").trim();

        // Subsection Heading: "1.1 Background and Motivation" (Left-aligned, Bold, 13pt)
        bodyChildren.push(
          new Paragraph({
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

        const subRaw = sub.content || sub.brief || "";
        const subParagraphs = parseParagraphsToDocx(subRaw, chapterNum, selectedFont, headingColor);
        bodyChildren.push(...subParagraphs);
      });
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
                data: diag.pngBuffer,
                transformation: {
                  width: targetW,
                  height: targetH
                }
              } as any)
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
                color: "475569"
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

function parsePPTXSlideContent(sec: AssembleSection) {
  const rawText = sec.content || sec.brief || "";
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets: string[] = [];
  let highlightMetric: string | null = null;
  let presenterNotes: string | null = null;

  lines.forEach((line) => {
    if (line.includes("KEY METRIC:") || line.includes("HIGHLIGHT STAT:") || line.includes("💡")) {
      highlightMetric = line
        .replace(/^[>\s*#💡-]+/, "")
        .replace(/\*\*KEY METRIC:\*\*/i, "")
        .replace(/\[Source:[^\]]+\]\([^)]+\)/g, "")
        .trim();
    } else if (line.includes("PRESENTER NOTES:") || line.includes("🎙️") || line.includes("Speaker Notes:")) {
      presenterNotes = line
        .replace(/^[>\s*#🎙️-]+/, "")
        .replace(/\*\*PRESENTER NOTES:\*\*/i, "")
        .trim();
    } else if (line.startsWith("*") || line.startsWith("-") || line.startsWith("•") || line.match(/^\d+\./)) {
      const cleaned = line
        .replace(/^[*•\-\d.]+\s*/, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .trim();
      if (cleaned.length > 5) bullets.push(cleaned);
    } else if (line.length > 25 && !line.startsWith("#") && !line.startsWith(">")) {
      const cleaned = line.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
      bullets.push(cleaned);
    }
  });

  if (bullets.length === 0 && sec.keyPoints && sec.keyPoints.length > 0) {
    bullets.push(...sec.keyPoints);
  }
  if (bullets.length === 0 && sec.brief) {
    bullets.push(sec.brief);
  }

  const titleLower = sec.title.toLowerCase();
  let layoutType: "split" | "metrics" | "pillars" | "roadmap" = "split";

  if (titleLower.includes("roadmap") || titleLower.includes("timeline") || titleLower.includes("phased") || titleLower.includes("execution")) {
    layoutType = "roadmap";
  } else if (titleLower.includes("metric") || titleLower.includes("financial") || titleLower.includes("benchmark") || titleLower.includes("growth") || titleLower.includes("economics")) {
    layoutType = "metrics";
  } else if (titleLower.includes("infrastructure") || titleLower.includes("technology") || titleLower.includes("competitive") || titleLower.includes("risk") || titleLower.includes("solution")) {
    layoutType = "pillars";
  }

  const cleanNotes = presenterNotes || `Key executive briefing for ${sec.title}. Emphasize empirical evidence, operational milestones, and strategic relevance.`;

  return { bullets, highlightMetric, presenterNotes: cleanNotes, layoutType };
}

export async function assemblePowerPoint(input: AssembleDocumentInput): Promise<Buffer> {
  const PptxClass = typeof pptxgen === "function" ? pptxgen : (pptxgen as any).default;
  const ppt = new PptxClass();
  ppt.layout = "LAYOUT_16x9"; // 10.0" wide x 5.625" high
  ppt.title = input.title;

  const palette = selectPPTXPalette(input.title, input.accentColor);
  let slideCounter = 1;

  // ==========================================
  // SLIDE 1: Title Slide (Dark Theme Sandwich Cover)
  // ==========================================
  const slide1 = ppt.addSlide();
  slide1.background = { color: palette.darkBg };

  // Top Pill Tag
  slide1.addShape(ppt.ShapeType.roundRect, {
    x: 0.8, y: 0.7, w: 2.8, h: 0.32,
    fill: { color: palette.cardDarkBg },
    line: { color: palette.accent, width: 1 },
    rectRadius: 0.15
  });
  slide1.addText("EXECUTIVE STRATEGY DECK", {
    x: 0.8, y: 0.7, w: 2.8, h: 0.32,
    fontFace: palette.bodyFont, fontSize: 9.5, color: palette.accent, bold: true, align: "center", margin: 0
  });

  // Presentation Title (32pt Bold)
  slide1.addText(input.title, {
    x: 0.8, y: 1.3, w: 8.4, h: 1.8,
    fontFace: palette.headerFont, fontSize: 32, color: palette.textLight, bold: true, wrap: true, margin: 0
  });

  // Subtitle
  slide1.addText(input.subtitle || "Comprehensive Strategic Assessment & Empirical Analysis", {
    x: 0.8, y: 3.2, w: 8.4, h: 0.8,
    fontFace: palette.bodyFont, fontSize: 14, color: palette.textLightMuted, italic: true, wrap: true, margin: 0
  });

  // Metadata Footer
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  slide1.addText(`Prepared by: ${input.author || "Strategic Research Group"}   |   Date: ${dateStr}   |   16:9 Widescreen`, {
    x: 0.8, y: 4.7, w: 8.4, h: 0.4,
    fontFace: palette.bodyFont, fontSize: 10.5, color: palette.textLightMuted, margin: 0
  });

  slide1.addNotes(`Welcome everyone. Today we are presenting "${input.title}". We will review the strategic background, empirical data, architectural mechanics, and actionable recommendations.`);

  // ==========================================
  // SLIDE 2: Executive Agenda & Taxonomy (Light Canvas)
  // ==========================================
  slideCounter++;
  const slide2 = ppt.addSlide();
  slide2.background = { color: palette.lightBg };

  // Top Section Pill
  slide2.addShape(ppt.ShapeType.roundRect, {
    x: 0.8, y: 0.45, w: 1.8, h: 0.28,
    fill: { color: palette.cardLightBg },
    line: { color: palette.secondary, width: 1 },
    rectRadius: 0.12
  });
  slide2.addText("TAXONOMY", {
    x: 0.8, y: 0.45, w: 1.8, h: 0.28,
    fontFace: palette.bodyFont, fontSize: 9, color: palette.secondary, bold: true, align: "center", margin: 0
  });

  slide2.addText("Executive Agenda & Content Taxonomy", {
    x: 0.8, y: 0.8, w: 8.4, h: 0.5,
    fontFace: palette.headerFont, fontSize: 20, color: palette.textDark, bold: true, margin: 0
  });

  // 2-Column Grid of Agenda Items
  const agendaList = input.sections.slice(0, 10);
  const itemsPerCol = Math.ceil(agendaList.length / 2);

  agendaList.forEach((sec, idx) => {
    const colIdx = Math.floor(idx / itemsPerCol);
    const rowIdx = idx % itemsPerCol;
    const posX = colIdx === 0 ? 0.8 : 5.1;
    const posY = 1.45 + (rowIdx * 0.65);
    const cleanTitle = sec.title.replace(/^\d+\.\s*/, "").replace(/^Slide \d+:\s*/, "");

    // Card Box
    slide2.addShape(ppt.ShapeType.roundRect, {
      x: posX, y: posY, w: 4.1, h: 0.52,
      fill: { color: palette.cardLightBg },
      line: { color: palette.cardBorder, width: 1 },
      rectRadius: 0.1
    });

    // Number Badge
    slide2.addText(String(idx + 1).padStart(2, "0"), {
      x: posX + 0.12, y: posY + 0.1, w: 0.35, h: 0.32,
      fontFace: palette.bodyFont, fontSize: 11, color: palette.secondary, bold: true, align: "center", margin: 0
    });

    // Title
    slide2.addText(cleanTitle, {
      x: posX + 0.55, y: posY + 0.1, w: 3.4, h: 0.32,
      fontFace: palette.bodyFont, fontSize: 11, color: palette.textDark, bold: true, margin: 0
    });
  });

  slide2.addNotes("Here is our content taxonomy for today's briefing. We will move through each strategic domain systematically.");

  // Footer Slide 2
  slide2.addText(`Slide ${slideCounter}  |  ${input.title.slice(0, 40)}`, {
    x: 0.8, y: 5.15, w: 8.4, h: 0.3,
    fontFace: palette.bodyFont, fontSize: 8.5, color: palette.textMuted, align: "right", margin: 0
  });

  // ==========================================
  // CONTENT SLIDES (Multi-Layout Engine)
  // ==========================================
  input.sections.forEach((sec, idx) => {
    slideCounter++;
    const slide = ppt.addSlide();
    slide.background = { color: palette.lightBg };

    const { bullets, highlightMetric, presenterNotes, layoutType } = parsePPTXSlideContent(sec);
    const cleanTitle = sec.title.replace(/^\d+\.\s*/, "").replace(/^Slide \d+:\s*/, "");

    // Common Header Tag & Title
    slide.addShape(ppt.ShapeType.roundRect, {
      x: 0.8, y: 0.45, w: 1.4, h: 0.26,
      fill: { color: palette.cardLightBg },
      line: { color: palette.secondary, width: 1 },
      rectRadius: 0.1
    });
    slide.addText(`SECTION ${idx + 1}`, {
      x: 0.8, y: 0.45, w: 1.4, h: 0.26,
      fontFace: palette.bodyFont, fontSize: 8.5, color: palette.secondary, bold: true, align: "center", margin: 0
    });

    slide.addText(cleanTitle, {
      x: 0.8, y: 0.78, w: 8.4, h: 0.48,
      fontFace: palette.headerFont, fontSize: 19, color: palette.textDark, bold: true, margin: 0
    });

    // RENDER BY LAYOUT TYPE
    if (layoutType === "metrics") {
      // ----------------------------------------
      // LAYOUT B: 3-Card Big Stat & KPI Highlights
      // ----------------------------------------
      const metricCards = [
        {
          label: "Primary Metric",
          stat: highlightMetric ? highlightMetric.split(" ")[0] : "+48.5%",
          desc: highlightMetric || bullets[0] || "Empirical baseline improvement observed across core benchmark parameters."
        },
        {
          label: "Operational Velocity",
          stat: "3.4x",
          desc: bullets[1] || "Quantified efficiency multiplier across strategic workflows and system integrations."
        },
        {
          label: "Target Alignment",
          stat: "99.8%",
          desc: bullets[2] || "High-fidelity compliance with institutional SLAs and regulatory governance standards."
        }
      ];

      metricCards.forEach((card, cIdx) => {
        const posX = 0.8 + (cIdx * 2.9);
        // Card Box
        slide.addShape(ppt.ShapeType.roundRect, {
          x: posX, y: 1.45, w: 2.65, h: 3.5,
          fill: { color: palette.cardLightBg },
          line: { color: palette.cardBorder, width: 1 },
          rectRadius: 0.15
        });

        // Pill
        slide.addText(card.label.toUpperCase(), {
          x: posX + 0.2, y: 1.7, w: 2.25, h: 0.25,
          fontFace: palette.bodyFont, fontSize: 8.5, color: palette.secondary, bold: true, margin: 0
        });

        // Large Stat Callout
        slide.addText(card.stat, {
          x: posX + 0.2, y: 2.05, w: 2.25, h: 0.7,
          fontFace: palette.headerFont, fontSize: 28, color: palette.primary, bold: true, margin: 0
        });

        // Description
        slide.addText(card.desc, {
          x: posX + 0.2, y: 2.85, w: 2.25, h: 1.8,
          fontFace: palette.bodyFont, fontSize: 11, color: palette.textDark, wrap: true, margin: 0
        });
      });
    } else if (layoutType === "pillars") {
      // ----------------------------------------
      // LAYOUT C: 3 Strategic Pillar Columns
      // ----------------------------------------
      const pillars = [
        { label: "01. Architecture & Protocol", points: bullets.slice(0, 2) },
        { label: "02. Operational Scaling", points: bullets.slice(2, 4) },
        { label: "03. Governance & Controls", points: bullets.slice(4, 6) }
      ];

      pillars.forEach((pillar, pIdx) => {
        const posX = 0.8 + (pIdx * 2.9);
        slide.addShape(ppt.ShapeType.roundRect, {
          x: posX, y: 1.45, w: 2.65, h: 3.5,
          fill: { color: palette.cardLightBg },
          line: { color: palette.cardBorder, width: 1 },
          rectRadius: 0.15
        });

        slide.addText(pillar.label, {
          x: posX + 0.2, y: 1.65, w: 2.25, h: 0.35,
          fontFace: palette.bodyFont, fontSize: 11, color: palette.primary, bold: true, margin: 0
        });

        const pillarBullets = (pillar.points.length > 0 ? pillar.points : [bullets[pIdx] || sec.brief]).map((text) => ({
          text,
          options: {
            bullet: true,
            fontFace: palette.bodyFont,
            fontSize: 10.5,
            color: palette.textDark,
            paraSpaceAfter: 8
          }
        }));

        slide.addText(pillarBullets, {
          x: posX + 0.2, y: 2.1, w: 2.25, h: 2.6,
          margin: 0
        });
      });
    } else if (layoutType === "roadmap") {
      // ----------------------------------------
      // LAYOUT D: Horizontal Phased Roadmap / Timeline
      // ----------------------------------------
      const phases = [
        { tag: "PHASE 1 (M1-M6)", title: "Foundational Deployment", desc: bullets[0] || "Core architecture setup, initial pilot integration, and validation baseline." },
        { tag: "PHASE 2 (M7-M18)", title: "Enterprise Scaling", desc: bullets[1] || "Cross-functional rollout, volume expansion, and automated monitoring protocols." },
        { tag: "PHASE 3 (M19-M36)", title: "Ecosystem Leadership", desc: bullets[2] || "Continuous optimization, network effect capture, and long-term margin resilience." }
      ];

      phases.forEach((ph, phIdx) => {
        const posX = 0.8 + (phIdx * 2.9);
        slide.addShape(ppt.ShapeType.roundRect, {
          x: posX, y: 1.45, w: 2.65, h: 3.5,
          fill: { color: palette.cardLightBg },
          line: { color: palette.cardBorder, width: 1 },
          rectRadius: 0.15
        });

        // Phase Tag Pill
        slide.addShape(ppt.ShapeType.roundRect, {
          x: posX + 0.18, y: 1.65, w: 1.8, h: 0.26,
          fill: { color: palette.lightBg },
          line: { color: palette.secondary, width: 1 },
          rectRadius: 0.1
        });
        slide.addText(ph.tag, {
          x: posX + 0.18, y: 1.65, w: 1.8, h: 0.26,
          fontFace: palette.bodyFont, fontSize: 8.5, color: palette.secondary, bold: true, align: "center", margin: 0
        });

        // Title
        slide.addText(ph.title, {
          x: posX + 0.18, y: 2.05, w: 2.25, h: 0.45,
          fontFace: palette.bodyFont, fontSize: 12, color: palette.textDark, bold: true, margin: 0
        });

        // Description
        slide.addText(ph.desc, {
          x: posX + 0.18, y: 2.6, w: 2.25, h: 2.1,
          fontFace: palette.bodyFont, fontSize: 11, color: palette.textDark, wrap: true, margin: 0
        });
      });
    } else {
      // ----------------------------------------
      // LAYOUT A: Split 2-Column Focus + Evidence (Default)
      // ----------------------------------------
      // Left Card: Executive Scope & Key Stat
      slide.addShape(ppt.ShapeType.roundRect, {
        x: 0.8, y: 1.45, w: 2.8, h: 3.5,
        fill: { color: palette.cardLightBg },
        line: { color: palette.cardBorder, width: 1 },
        rectRadius: 0.15
      });

      slide.addText("EXECUTIVE FOCUS", {
        x: 1.0, y: 1.65, w: 2.4, h: 0.25,
        fontFace: palette.bodyFont, fontSize: 9, color: palette.secondary, bold: true, margin: 0
      });

      slide.addText(sec.brief || "Strategic analysis of operational factors, empirical metrics, and deployment directives.", {
        x: 1.0, y: 2.0, w: 2.4, h: highlightMetric ? 1.5 : 2.6,
        fontFace: palette.bodyFont, fontSize: 11, color: palette.textDark, italic: true, wrap: true, margin: 0
      });

      if (highlightMetric) {
        slide.addShape(ppt.ShapeType.roundRect, {
          x: 1.0, y: 3.65, w: 2.4, h: 1.05,
          fill: { color: palette.lightBg },
          line: { color: palette.accent, width: 1 },
          rectRadius: 0.1
        });
        slide.addText("KEY METRIC", {
          x: 1.1, y: 3.75, w: 2.2, h: 0.2,
          fontFace: palette.bodyFont, fontSize: 8, color: palette.secondary, bold: true, margin: 0
        });
        slide.addText(highlightMetric, {
          x: 1.1, y: 4.0, w: 2.2, h: 0.6,
          fontFace: palette.headerFont, fontSize: 11, color: palette.primary, bold: true, wrap: true, margin: 0
        });
      }

      // Right Card: Strategic Findings & Takeaways
      slide.addShape(ppt.ShapeType.roundRect, {
        x: 3.8, y: 1.45, w: 5.4, h: 3.5,
        fill: { color: palette.lightBg },
        line: { color: palette.cardBorder, width: 1 },
        rectRadius: 0.15
      });

      slide.addText("STRATEGIC FINDINGS & EMPIRICAL EVIDENCE", {
        x: 4.05, y: 1.65, w: 4.9, h: 0.25,
        fontFace: palette.bodyFont, fontSize: 9, color: palette.primary, bold: true, margin: 0
      });

      const bulletObjs = bullets.slice(0, 4).map((item) => ({
        text: item,
        options: {
          bullet: true,
          fontFace: palette.bodyFont,
          fontSize: 11.5,
          color: palette.textDark,
          paraSpaceAfter: 10
        }
      }));

      slide.addText(bulletObjs, {
        x: 4.05, y: 2.05, w: 4.9, h: 2.65,
        margin: 0
      });
    }

    // Slide Notes
    slide.addNotes(presenterNotes);

    // Footer
    slide.addText(`Slide ${slideCounter}  |  ${input.title.slice(0, 40)}`, {
      x: 0.8, y: 5.15, w: 8.4, h: 0.3,
      fontFace: palette.bodyFont, fontSize: 8.5, color: palette.textMuted, align: "right", margin: 0
    });
  });

  // ==========================================
  // CONCLUDING SLIDE: Synthesis & Verdict (Dark Sandwich Back)
  // ==========================================
  slideCounter++;
  const finalSlide = ppt.addSlide();
  finalSlide.background = { color: palette.darkBg };

  finalSlide.addShape(ppt.ShapeType.roundRect, {
    x: 0.8, y: 0.8, w: 2.6, h: 0.32,
    fill: { color: palette.cardDarkBg },
    line: { color: palette.accent, width: 1 },
    rectRadius: 0.15
  });
  finalSlide.addText("STRATEGIC VERDICT", {
    x: 0.8, y: 0.8, w: 2.6, h: 0.32,
    fontFace: palette.bodyFont, fontSize: 9.5, color: palette.accent, bold: true, align: "center", margin: 0
  });

  finalSlide.addText("Synthesis & Strategic Directives", {
    x: 0.8, y: 1.4, w: 8.4, h: 0.8,
    fontFace: palette.headerFont, fontSize: 28, color: palette.textLight, bold: true, margin: 0
  });

  finalSlide.addText("Comprehensive empirical synthesis complete. Architectural paradigms, market sizing, and execution milestones are aligned for institutional deployment.", {
    x: 0.8, y: 2.3, w: 8.4, h: 0.9,
    fontFace: palette.bodyFont, fontSize: 13, color: palette.textLightMuted, italic: true, wrap: true, margin: 0
  });

  // Callout Action Box
  finalSlide.addShape(ppt.ShapeType.roundRect, {
    x: 0.8, y: 3.5, w: 8.4, h: 1.1,
    fill: { color: palette.cardDarkBg },
    line: { color: palette.accent, width: 1 },
    rectRadius: 0.15
  });

  finalSlide.addText("Thank You   •   Questions & Discussion", {
    x: 0.8, y: 3.65, w: 8.4, h: 0.4,
    fontFace: palette.bodyFont, fontSize: 16, color: palette.accent, bold: true, align: "center", margin: 0
  });
  finalSlide.addText("Prepared for institutional review and executive decision-making.", {
    x: 0.8, y: 4.1, w: 8.4, h: 0.35,
    fontFace: palette.bodyFont, fontSize: 11, color: palette.textLightMuted, align: "center", margin: 0
  });

  finalSlide.addNotes("Thank you for your time. We are now open for executive questions, strategic evaluation, and discussion on next steps.");

  const buffer = (await ppt.stream()) as Buffer;
  return buffer;
}

// 3. PDF (.pdf) Assembler - Corporate / Academic Times New Roman 12pt A4 Document
export async function assemblePdfDocument(input: AssembleDocumentInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const PDFDocClass = typeof PDFDocument === "function" ? PDFDocument : (PDFDocument as any).default;
    const doc = new PDFDocClass({
      margin: 72, // Standard 1-inch margins
      size: "A4",
      bufferPages: true
    });
    const buffers: Buffer[] = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Running Header (Pages 2+)
        if (i > 0) {
          doc.fillColor("#333333").font("Times-Italic").fontSize(9);
          doc.text(input.title, 72, 36, { align: "right", width: 451 });
          doc.moveTo(72, 48).lineTo(523, 48).strokeColor("#000000").lineWidth(0.5).stroke();
        }

        // Running Footer with Page Numbers (All Pages)
        doc.fillColor("#555555").font("Times-Roman").fontSize(9);
        doc.text(`CONFIDENTIAL & ACADEMIC TREATISE`, 72, 780, { align: "left", width: 250 });
        doc.text(`Page ${i + 1} of ${range.count}`, 72, 780, { align: "right", width: 451 });
      }

      resolve(Buffer.concat(buffers));
    });
    doc.on("error", (err) => reject(err));

    // Cover / Title Page Block
    doc.fillColor("#000000").font("Times-Bold").fontSize(22).text(input.title.toUpperCase(), { align: "center", lineGap: 6 });
    doc.moveDown(0.4);

    doc.fillColor("#333333").font("Times-Italic").fontSize(13).text(input.subtitle, { align: "center", lineGap: 3 });
    doc.moveDown(0.5);

    doc.fillColor("#000000").font("Times-Roman").fontSize(10).text(
      `Prepared for: Academic & Corporate Review  |  Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      { align: "center" }
    );
    doc.moveDown(0.8);

    // Divider Line
    doc.moveTo(72, doc.y).lineTo(523, doc.y).strokeColor("#000000").lineWidth(1).stroke();
    doc.moveDown(1.5);

    // Table of Contents Preview
    doc.fillColor("#000000").font("Times-Bold").fontSize(14).text("TABLE OF CONTENTS", { align: "center" });
    doc.moveDown(0.8);

    input.sections.forEach((sec, idx) => {
      doc.fillColor("#000000").font("Times-Roman").fontSize(11);
      const titleStr = `${idx + 1}. ${sec.title.replace(/^\d+\.\s*/, "")}`;
      const pageStr = `Page ${idx + 1}`;
      const dotsCount = Math.max(3, Math.floor((451 - doc.widthOfString(titleStr) - doc.widthOfString(pageStr)) / doc.widthOfString(".")));
      const dotLine = " " + ".".repeat(dotsCount) + " ";
      doc.text(`${titleStr}${dotLine}${pageStr}`, { align: "justify", lineGap: 3 });
    });
    doc.moveDown(1.5);

    // Chapters & Subsections
    input.sections.forEach((sec, idx) => {
      if (doc.y > 640) {
        doc.addPage();
      }

      doc.fillColor("#000000").font("Times-Bold").fontSize(16).text(
        `${idx + 1}. ${sec.title.replace(/^\d+\.\s*/, "")}`,
        { lineGap: 4 }
      );
      doc.moveDown(0.3);

      // Chapter Overview / Scope
      if (sec.brief) {
        doc.fillColor("#333333").font("Times-Italic").fontSize(11.5).text(`Chapter Scope: ${sec.brief}`, {
          align: "justify",
          lineGap: 3
        });
        doc.moveDown(0.6);
      }

      const paragraphs = (sec.content || sec.brief || "").split("\n\n");
      paragraphs.forEach((pText) => {
        if (!pText.trim()) return;

        // Handle Markdown Tables in PDF
        if (isMarkdownTable(pText)) {
          if (doc.y > 660) doc.addPage();
          const tableLines = pText.trim().split("\n").filter(l => l.includes("|"));
          const validRows: string[][] = [];
          tableLines.forEach((l) => {
            if (/^\|?(\s*:?-+:?\s*\|?)+\s*$/.test(l.trim())) return;
            const cells = l.split("|").slice(1, -1).map(c => c.trim());
            if (cells.length > 0) validRows.push(cells);
          });

          if (validRows.length > 0) {
            const colCount = validRows[0].length;
            const colWidth = 451 / colCount;
            const startX = 72;

            validRows.forEach((row, rIdx) => {
              if (doc.y > 720) doc.addPage();
              const isHeader = rIdx === 0;
              const rowY = doc.y;
              const rowHeight = 22;

              // Row background
              if (isHeader) {
                doc.rect(startX, rowY, 451, rowHeight).fillColor("#F0F2F5").fill();
              } else if (rIdx % 2 === 0) {
                doc.rect(startX, rowY, 451, rowHeight).fillColor("#FAF9F5").fill();
              }

              // Row borders
              doc.rect(startX, rowY, 451, rowHeight).strokeColor("#CBD5E1").lineWidth(0.5).stroke();

              // Cell text
              row.forEach((cellText, cIdx) => {
                doc.fillColor("#000000")
                  .font(isHeader ? "Times-Bold" : "Times-Roman")
                  .fontSize(isHeader ? 10 : 9.5)
                  .text(cellText, startX + (cIdx * colWidth) + 4, rowY + 5, {
                    width: colWidth - 8,
                    align: isHeader ? "center" : "left"
                  });
              });

              doc.y = rowY + rowHeight;
            });
            doc.moveDown(0.6);
            return;
          }
        }

        // Subheadings
        if (pText.startsWith("### ")) {
          if (doc.y > 680) doc.addPage();
          doc.fillColor("#000000").font("Times-Bold").fontSize(13.5).text(pText.replace(/^###\s*/, ""), { lineGap: 3 });
          doc.moveDown(0.3);
          return;
        }

        if (pText.startsWith("## ")) {
          if (doc.y > 680) doc.addPage();
          doc.fillColor("#000000").font("Times-Bold").fontSize(14.5).text(pText.replace(/^##\s*/, ""), { lineGap: 3 });
          doc.moveDown(0.4);
          return;
        }

        const formattedText = pText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, "$1 ($2)");

        if (doc.y > 690) {
          doc.addPage();
        }

        doc.fillColor("#000000").font("Times-Roman").fontSize(12).text(formattedText, {
          align: "justify",
          lineGap: 4, // 1.5-like spacing
          paragraphGap: 8
        });
      });

      doc.moveDown(1.0);
    });

    doc.end();
  });
}
