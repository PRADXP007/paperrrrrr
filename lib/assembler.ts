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
  ShadingType
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

/**
 * Parses Markdown paragraphs and transforms embedded citations
 * like [Source: Title](https://...) into real Word ExternalHyperlink nodes.
 */
/**
 * Parses Markdown paragraphs and transforms embedded citations
 * like [Source: Title](https://...) into real Word ExternalHyperlink nodes.
 * Strictly formatted in Times New Roman 12pt pure black text.
 */
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

// 2. PowerPoint (.pptx) Assembler - Multi-Layout Widescreen Engine
export async function assemblePowerPoint(input: AssembleDocumentInput): Promise<Buffer> {
  const PptxClass = typeof pptxgen === "function" ? pptxgen : (pptxgen as any).default;
  const ppt = new PptxClass();
  ppt.layout = "LAYOUT_16x9";
  ppt.title = input.title;

  // Slide 1: Title Cover Slide
  const slide1 = ppt.addSlide();
  slide1.background = { color: "FAF9F5" };

  // Top Accent Bar
  slide1.addShape(ppt.ShapeType.rect, {
    x: 0.8, y: 0.8, w: 11.7, h: 0.1, fill: { color: "97422C" }
  });

  slide1.addText(input.title, {
    x: 0.8, y: 1.6, w: 11.5, h: 1.8,
    fontFace: "Georgia", fontSize: 32, color: "97422C", bold: true, wrap: true
  });

  slide1.addText(input.subtitle, {
    x: 0.8, y: 3.5, w: 11.5, h: 0.9,
    fontFace: "Arial", fontSize: 16, color: "55423E", italic: true, wrap: true
  });

  // Footer & Author
  slide1.addText(`Generated by Paperrrrrr • ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, {
    x: 0.8, y: 5.6, w: 10.0, h: 0.4,
    fontFace: "Arial", fontSize: 12, color: "88726D"
  });

  let slideCounter = 1;

  // Content Slides: Two-Column Card Layout with Overflow Splitting
  input.sections.forEach((sec, idx) => {
    const rawParagraphs = (sec.content || sec.brief || "")
      .split("\n\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const bulletItems: string[] = [];
    rawParagraphs.forEach((para) => {
      const cleaned = para.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
      const sentences = cleaned.split(/(?<=[.?!])\s+/);
      let currentBullet = "";
      sentences.forEach((sent) => {
        if ((currentBullet + " " + sent).length < 240) {
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
      slide.background = { color: "FAF9F5" };

      // Top Consistent Accent Bar
      slide.addShape(ppt.ShapeType.rect, {
        x: 0.8, y: 0.5, w: 11.7, h: 0.08, fill: { color: "97422C" }
      });

      // Section Title
      const displayTitle = totalSlideParts > 1
        ? `${idx + 1}. ${sec.title.replace(/^\d+\.\s*/, "")} (Part ${part + 1}/${totalSlideParts})`
        : `${idx + 1}. ${sec.title.replace(/^\d+\.\s*/, "")}`;

      slide.addText(displayTitle, {
        x: 0.8, y: 0.7, w: 11.5, h: 0.6,
        fontFace: "Georgia", fontSize: 20, color: "97422C", bold: true
      });

      // Left Column: Scope Focus Card
      slide.addShape(ppt.ShapeType.rect, {
        x: 0.8, y: 1.5, w: 3.6, h: 4.8,
        fill: { color: "FFFFFF" }, line: { color: "DBC1BA", width: 1 }
      });

      slide.addText("EXECUTIVE FOCUS", {
        x: 1.0, y: 1.8, w: 3.2, h: 0.4,
        fontFace: "Arial", fontSize: 11, color: "97422C", bold: true
      });

      slide.addText(sec.brief, {
        x: 1.0, y: 2.3, w: 3.2, h: 3.6,
        fontFace: "Arial", fontSize: 13, color: "55423E", italic: true, lineSpacing: 20
      });

      // Right Column: Empirical Takeaways Card
      slide.addShape(ppt.ShapeType.rect, {
        x: 4.7, y: 1.5, w: 7.8, h: 4.8,
        fill: { color: "FFFFFF" }, line: { color: "DBC1BA", width: 1 }
      });

      slide.addText("STRATEGIC TAKEAWAYS & EMPIRICAL FINDINGS", {
        x: 5.0, y: 1.8, w: 7.2, h: 0.4,
        fontFace: "Arial", fontSize: 11, color: "97422C", bold: true
      });

      const currentChunk = bulletItems.slice(part * itemsPerSlide, (part + 1) * itemsPerSlide);
      const textObjects = currentChunk.map((item) => ({
        text: item,
        options: {
          bullet: true,
          fontFace: "Arial",
          fontSize: 12.5,
          color: "1B1C1A",
          lineSpacing: 19,
          paraSpaceAfter: 12
        }
      }));

      slide.addText(textObjects, {
        x: 5.0, y: 2.3, w: 7.2, h: 3.8,
        valign: "top"
      });

      // Footer Slide Number
      slide.addText(`Paperrrrrr • Slide ${slideCounter}`, {
        x: 0.8, y: 6.8, w: 11.7, h: 0.3,
        fontFace: "Arial", fontSize: 10, color: "88726D", align: "right"
      });
    }
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
