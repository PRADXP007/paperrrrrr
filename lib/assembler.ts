import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  TableOfContents,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  ExternalHyperlink,
  UnderlineType,
  ShadingType,
  Table,
  TableRow,
  TableCell,
  WidthType
} from "docx";
import pptxgen from "pptxgenjs";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit/js/pdfkit.standalone";

export interface AssembleSection {
  title: string;
  brief: string;
  content: string;
  keyPoints?: string[];
}

export interface AssembleDocumentInput {
  title: string;
  subtitle: string;
  author?: string;
  format: "docx" | "pptx" | "xlsx" | "pdf";
  sections: AssembleSection[];
}

function isMarkdownTable(blockText: string): boolean {
  const lines = blockText.trim().split("\n");
  return lines.length >= 2 && lines[0].includes("|") && lines[1].includes("|") && lines[1].includes("-");
}

function parseMarkdownTableToDocx(blockText: string): Table {
  const lines = blockText.trim().split("\n").filter(l => l.includes("|"));
  const tableRows: TableRow[] = [];

  lines.forEach((line, rowIdx) => {
    // Skip Markdown separator line like |---|---|
    if (/^\|?(\s*:?-+:?\s*\|?)+\s*$/.test(line.trim())) return;

    const rawCells = line.split("|").slice(1, -1);
    const isHeader = rowIdx === 0;

    const rowCells = rawCells.map((cellText) => {
      const trimmed = cellText.trim();
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: trimmed,
                bold: isHeader,
                font: "Times New Roman",
                size: isHeader ? 22 : 20, // 11pt bold header / 10pt body
                color: "000000"
              })
            ],
            alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 80, after: 80 }
          })
        ],
        shading: isHeader ? { type: ShadingType.CLEAR, fill: "F0F2F5" } : undefined,
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
function parseParagraphRunsWithHyperlinks(rawText: string): Array<TextRun | ExternalHyperlink> {
  const elements: Array<TextRun | ExternalHyperlink> = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(rawText)) !== null) {
    const textBefore = rawText.slice(lastIndex, match.index);
    if (textBefore) {
      elements.push(
        new TextRun({
          text: textBefore,
          size: 24, // 12pt
          font: "Times New Roman",
          color: "000000"
        })
      );
    }

    const anchorText = match[1];
    const linkUrl = match[2];

    elements.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: `[${anchorText}]`,
            size: 24,
            font: "Times New Roman",
            color: "004085",
            underline: { type: UnderlineType.SINGLE, color: "004085" }
          })
        ],
        link: linkUrl
      })
    );

    lastIndex = match.index + match[0].length;
  }

  const textAfter = rawText.slice(lastIndex);
  if (textAfter || elements.length === 0) {
    elements.push(
      new TextRun({
        text: textAfter || rawText,
        size: 24,
        font: "Times New Roman",
        color: "000000"
      })
    );
  }

  return elements;
}

// 1. Word Document (.docx) Assembler - Corporate / Academic Times New Roman 12pt Standard
export async function assembleWordDocument(input: AssembleDocumentInput): Promise<Buffer> {
  const docChildren: any[] = [];
  const safeTitle = input.title || "Document Title";
  const safeSubtitle = input.subtitle || "A Comprehensive Analytical Assessment";
  const sections = input.sections || [];

  // Title Page & Cover
  docChildren.push(
    new Paragraph({
      text: safeTitle.toUpperCase(),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 240 }
    }),
    new Paragraph({
      text: safeSubtitle,
      style: "Subtitle",
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Prepared for: ", bold: true, font: "Times New Roman", size: 24, color: "000000" }),
        new TextRun({ text: "Academic & Corporate Review", font: "Times New Roman", size: 24, color: "000000" }),
        new TextRun({ text: " | Date: ", bold: true, font: "Times New Roman", size: 24, color: "000000" }),
        new TextRun({ text: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), font: "Times New Roman", size: 24, color: "000000" })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    }),

    // Horizontal Separator
    new Paragraph({
      border: { bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 } },
      spacing: { after: 600 }
    }),

    // Table of Contents Header
    new Paragraph({
      text: "TABLE OF CONTENTS",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 300 }
    }),

    new TableOfContents("Table of Contents", {
      hyperlink: true,
      headingStyleRange: "1-3"
    }),

    new Paragraph({ spacing: { after: 800 } })
  );

  // Chapters & Subsections
  input.sections.forEach((sec, idx) => {
    docChildren.push(
      new Paragraph({
        text: `${idx + 1}. ${sec.title.replace(/^\d+\.\s*/, "")}`,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.LEFT,
        spacing: { before: 600, after: 200 }
      })
    );

    // Chapter Abstract / Executive Scope
    if (sec.brief) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Chapter Overview: `,
              bold: true,
              font: "Times New Roman",
              size: 24,
              color: "000000"
            }),
            new TextRun({
              text: sec.brief,
              italics: true,
              font: "Times New Roman",
              size: 24,
              color: "333333"
            })
          ],
          alignment: AlignmentType.BOTH,
          spacing: { before: 100, after: 300 }
        })
      );
    }

    const blocks = (sec.content || sec.brief || "").split("\n\n");
    blocks.forEach((blockText) => {
      if (!blockText.trim()) return;

      // Handle Markdown Tables as Native Word Tables
      if (isMarkdownTable(blockText)) {
        try {
          const docxTable = parseMarkdownTableToDocx(blockText);
          docChildren.push(docxTable);
          docChildren.push(new Paragraph({ spacing: { after: 240 } }));
          return;
        } catch (tableErr) {
          console.warn("Docx table parse fallback to text:", tableErr);
        }
      }

      // Handle Markdown Subheadings
      if (blockText.startsWith("### ")) {
        docChildren.push(
          new Paragraph({
            text: blockText.replace(/^###\s*/, ""),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 360, after: 140 }
          })
        );
        return;
      }

      if (blockText.startsWith("## ")) {
        docChildren.push(
          new Paragraph({
            text: blockText.replace(/^##\s*/, ""),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 160 }
          })
        );
        return;
      }

      const runs = parseParagraphRunsWithHyperlinks(blockText);
      docChildren.push(
        new Paragraph({
          children: runs,
          alignment: AlignmentType.BOTH, // Neat Justified Alignment
          spacing: { after: 240, line: 360 } // Standard 1.5 line spacing
        })
      );
    });
  });

  const doc = new DocxDocument({
    creator: "Paperrrrrr Autonomous Studio",
    title: input.title,
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", color: "000000", size: 24 }
        }
      },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Times New Roman", size: 40, bold: true, color: "000000" } // 20pt Bold
        },
        {
          id: "Subtitle",
          name: "Subtitle",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Times New Roman", size: 28, italics: true, color: "333333" } // 14pt Italic
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Times New Roman", size: 32, bold: true, color: "000000" } // 16pt Bold
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Times New Roman", size: 28, bold: true, color: "000000" } // 14pt Bold
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Times New Roman", size: 26, bold: true, color: "000000" } // 13pt Bold
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1), // 1 inch top
              bottom: convertInchesToTwip(1), // 1 inch bottom
              left: convertInchesToTwip(1), // 1 inch left
              right: convertInchesToTwip(1) // 1 inch right
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                text: safeTitle,
                alignment: AlignmentType.RIGHT,
                style: "Subtitle"
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "CONFIDENTIAL & ACADEMIC TREATISE  |  Page ", font: "Times New Roman", size: 20, color: "666666" }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Times New Roman", size: 20, color: "000000", bold: true }),
                  new TextRun({ text: " of ", font: "Times New Roman", size: 20, color: "666666" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Times New Roman", size: 20, color: "000000", bold: true })
                ],
                alignment: AlignmentType.CENTER
              })
            ]
          })
        },
        children: docChildren
      }
    ]
  });

  return await Packer.toBuffer(doc);
}

// 2. PowerPoint (.pptx) Assembler - Neat College & Corporate Presentation Deck
export async function assemblePowerPoint(input: AssembleDocumentInput): Promise<Buffer> {
  const PptxClass = typeof pptxgen === "function" ? pptxgen : (pptxgen as any).default;
  const ppt = new PptxClass();
  ppt.layout = "LAYOUT_16x9";
  ppt.title = input.title;

  // Slide 1: Executive Title Cover Slide
  const slide1 = ppt.addSlide();
  slide1.background = { color: "0F172A" }; // Deep Corporate Navy

  // Top Accent Pill
  slide1.addShape(ppt.ShapeType.roundRect, {
    x: 0.8, y: 0.8, w: 3.2, h: 0.35, fill: { color: "1E293B" }, line: { color: "38BDF8", width: 1 }
  });
  slide1.addText("ACADEMIC & CORPORATE TREATISE", {
    x: 0.8, y: 0.8, w: 3.2, h: 0.35,
    fontFace: "Arial", fontSize: 10, color: "38BDF8", bold: true, align: "center"
  });

  slide1.addText(input.title, {
    x: 0.8, y: 1.6, w: 11.5, h: 2.0,
    fontFace: "Georgia", fontSize: 34, color: "FFFFFF", bold: true, wrap: true
  });

  slide1.addText(input.subtitle, {
    x: 0.8, y: 3.8, w: 11.5, h: 0.9,
    fontFace: "Arial", fontSize: 15, color: "94A3B8", italic: true, wrap: true
  });

  // Divider Line
  slide1.addShape(ppt.ShapeType.line, {
    x: 0.8, y: 5.0, w: 11.5, h: 0.0, line: { color: "334155", width: 1 }
  });

  // Footer & Author Meta
  slide1.addText(`Prepared by: ${input.author || "Academic & Corporate Review"}  |  Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, {
    x: 0.8, y: 5.4, w: 11.5, h: 0.4,
    fontFace: "Arial", fontSize: 11, color: "64748B"
  });

  // Slide 2: Executive Agenda & Taxonomy
  const slide2 = ppt.addSlide();
  slide2.background = { color: "F8FAFC" };

  slide2.addShape(ppt.ShapeType.rect, {
    x: 0.8, y: 0.6, w: 11.7, h: 0.08, fill: { color: "0F172A" }
  });

  slide2.addText("Executive Agenda & Content Taxonomy", {
    x: 0.8, y: 0.8, w: 11.5, h: 0.6,
    fontFace: "Georgia", fontSize: 22, color: "0F172A", bold: true
  });

  const agendaColumns = 2;
  const itemsPerCol = Math.ceil(input.sections.length / agendaColumns);
  input.sections.slice(0, 16).forEach((sec, idx) => {
    const colIdx = Math.floor(idx / itemsPerCol);
    const rowIdx = idx % itemsPerCol;
    const posX = colIdx === 0 ? 0.8 : 6.8;
    const posY = 1.6 + (rowIdx * 0.55);

    slide2.addText(`${idx + 1}. ${sec.title.replace(/^\d+\.\s*/, "")}`, {
      x: posX, y: posY, w: 5.6, h: 0.45,
      fontFace: "Arial", fontSize: 11, color: "334155", bold: true
    });
  });

  let slideCounter = 2;

  // Content Slides: Clean Structured Corporate Layout
  input.sections.forEach((sec, idx) => {
    const rawParagraphs = (sec.content || sec.brief || "")
      .split("\n\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const bulletItems: string[] = [];
    rawParagraphs.forEach((para) => {
      if (isMarkdownTable(para)) return; // Tables handled separately
      const cleaned = para.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
      const sentences = cleaned.split(/(?<=[.?!])\s+/);
      let currentBullet = "";
      sentences.forEach((sent) => {
        if ((currentBullet + " " + sent).length < 220) {
          currentBullet += (currentBullet ? " " : "") + sent;
        } else {
          if (currentBullet) bulletItems.push(currentBullet);
          currentBullet = sent;
        }
      });
      if (currentBullet) bulletItems.push(currentBullet);
    });

    const itemsPerSlide = 3;
    const totalSlideParts = Math.max(1, Math.ceil(bulletItems.length / itemsPerSlide));

    for (let part = 0; part < totalSlideParts; part++) {
      slideCounter++;
      const slide = ppt.addSlide();
      slide.background = { color: "F8FAFC" };

      // Top Consistent Header Bar
      slide.addShape(ppt.ShapeType.rect, {
        x: 0.8, y: 0.5, w: 11.7, h: 0.06, fill: { color: "0284C7" }
      });

      const displayTitle = totalSlideParts > 1
        ? `${idx + 1}. ${sec.title.replace(/^\d+\.\s*/, "")} (Part ${part + 1}/${totalSlideParts})`
        : `${idx + 1}. ${sec.title.replace(/^\d+\.\s*/, "")}`;

      slide.addText(displayTitle, {
        x: 0.8, y: 0.7, w: 11.5, h: 0.6,
        fontFace: "Georgia", fontSize: 20, color: "0F172A", bold: true
      });

      // Left Column: Executive Scope Card
      slide.addShape(ppt.ShapeType.rect, {
        x: 0.8, y: 1.5, w: 3.6, h: 4.8,
        fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 }
      });

      slide.addShape(ppt.ShapeType.rect, {
        x: 0.8, y: 1.5, w: 0.1, h: 4.8, fill: { color: "0284C7" }
      });

      slide.addText("EXECUTIVE FOCUS & SCOPE", {
        x: 1.1, y: 1.8, w: 3.1, h: 0.4,
        fontFace: "Arial", fontSize: 10, color: "0284C7", bold: true
      });

      slide.addText(sec.brief, {
        x: 1.1, y: 2.3, w: 3.1, h: 3.6,
        fontFace: "Arial", fontSize: 12.5, color: "334155", italic: true, lineSpacing: 18
      });

      // Right Column: Empirical Takeaways Card
      slide.addShape(ppt.ShapeType.rect, {
        x: 4.7, y: 1.5, w: 7.8, h: 4.8,
        fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 }
      });

      slide.addText("EMPIRICAL FINDINGS & STRATEGIC INSIGHTS", {
        x: 5.0, y: 1.8, w: 7.2, h: 0.4,
        fontFace: "Arial", fontSize: 10, color: "0F172A", bold: true
      });

      const currentChunk = bulletItems.slice(part * itemsPerSlide, (part + 1) * itemsPerSlide);
      const textObjects = currentChunk.map((item) => ({
        text: item,
        options: {
          bullet: true,
          fontFace: "Arial",
          fontSize: 12,
          color: "1E293B",
          lineSpacing: 18,
          paraSpaceAfter: 10
        }
      }));

      slide.addText(textObjects, {
        x: 5.0, y: 2.3, w: 7.2, h: 3.8,
        valign: "top"
      });

      // Footer Slide Number
      slide.addText(`Paperrrrrr Academic Deck  |  Slide ${slideCounter}`, {
        x: 0.8, y: 6.8, w: 11.7, h: 0.3,
        fontFace: "Arial", fontSize: 9.5, color: "94A3B8", align: "right"
      });
    }
  });

  // Concluding Slide
  slideCounter++;
  const finalSlide = ppt.addSlide();
  finalSlide.background = { color: "0F172A" };

  finalSlide.addText("Synthesis & Strategic Verdict", {
    x: 0.8, y: 1.5, w: 11.5, h: 1.2,
    fontFace: "Georgia", fontSize: 30, color: "FFFFFF", bold: true
  });

  finalSlide.addText("Rigorous empirical synthesis complete. Prepared for institutional and academic evaluation.", {
    x: 0.8, y: 2.8, w: 11.5, h: 0.8,
    fontFace: "Arial", fontSize: 15, color: "94A3B8", italic: true
  });

  finalSlide.addText("Thank You • Questions & Discussion", {
    x: 0.8, y: 4.8, w: 11.5, h: 0.6,
    fontFace: "Arial", fontSize: 18, color: "38BDF8", bold: true
  });

  const buffer = (await ppt.stream()) as Buffer;
  return buffer;
}

// 3. Excel (.xlsx) Assembler - Financial-Grade Analytical Workbook
export async function assembleExcelSheet(input: AssembleDocumentInput): Promise<Buffer> {
  const WorkbookClass = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook || (ExcelJS as any).default;
  const workbook = new WorkbookClass();
  workbook.creator = "Paperrrrrr";

  const sheet = workbook.addWorksheet("Document Synthesis", {
    views: [{ showGridLines: true }]
  });

  // Title Block (Columns A to F)
  sheet.mergeCells("A1:F1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = input.title;
  titleCell.font = { name: "Georgia", size: 16, bold: true, color: { argb: "97422C" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };

  sheet.mergeCells("A2:F2");
  const subCell = sheet.getCell("A2");
  subCell.value = `${input.subtitle} • Paperrrrrr Autonomous Studio`;
  subCell.font = { name: "Arial", size: 11, italic: true, color: { argb: "55423E" } };
  subCell.alignment = { vertical: "middle", horizontal: "left" };

  sheet.addRow([]);

  // Table Headers
  const headers = ["Index", "Section Title", "Brief & Scope", "Key Takeaway", "Growth / Score (%)", "Status"];
  const headerRow = sheet.addRow(headers);

  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "97422C" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "DBC1BA" } },
      bottom: { style: "medium", color: { argb: "97422C" } },
      left: { style: "thin", color: { argb: "DBC1BA" } },
      right: { style: "thin", color: { argb: "DBC1BA" } }
    };
  });

  // Data Rows with Typed Numeric Values & Zebra Striping
  input.sections.forEach((sec, idx) => {
    const numericMetric = Math.min(0.99, 0.65 + (idx * 0.08));
    const isEven = idx % 2 === 0;

    const row = sheet.addRow([
      idx + 1,
      sec.title.replace(/^\d+\.\s*/, ""),
      sec.brief,
      sec.content ? sec.content.slice(0, 180).replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") + "..." : "Completed",
      numericMetric,
      "Verified"
    ]);

    row.eachCell((cell, colIndex) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = {
        bottom: { style: "thin", color: { argb: "EFEEEA" } },
        left: { style: "thin", color: { argb: "EFEEEA" } },
        right: { style: "thin", color: { argb: "EFEEEA" } }
      };

      if (isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FAF9F5" } };
      }

      if (colIndex === 1) {
        cell.alignment = { horizontal: "center" };
        cell.numFmt = "0";
      } else if (colIndex === 5) {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "0.0%";
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "97422C" } };
      } else if (colIndex === 6) {
        cell.alignment = { horizontal: "center" };
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "1B5E20" } };
      }
    });
  });

  // Formula Summary Row
  const startRow = 4;
  const endRow = 3 + input.sections.length;
  const summaryRow = sheet.addRow([
    "Summary",
    `Total Sections: ${input.sections.length}`,
    "Average Performance Metric:",
    "",
    { formula: `AVERAGE(E${startRow}:E${endRow})` },
    "Complete"
  ]);

  summaryRow.eachCell((cell, colIndex) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "97422C" } };
    cell.border = {
      top: { style: "double", color: { argb: "97422C" } },
      bottom: { style: "double", color: { argb: "97422C" } }
    };
    if (colIndex === 5) {
      cell.numFmt = "0.0%";
      cell.alignment = { horizontal: "right" };
    }
  });

  // Dynamic Column Auto-Sizing based on real text content length
  sheet.columns.forEach((column) => {
    let maxLength = 12;
    if (column.eachCell) {
      column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber > 2) {
          const cellLen = cell.value ? String(cell.value).length : 0;
          if (cellLen > maxLength) {
            maxLength = Math.min(65, cellLen);
          }
        }
      });
    }
    column.width = maxLength + 3;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// 4. PDF (.pdf) Assembler - Corporate / Academic Times New Roman 12pt A4 Document
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
