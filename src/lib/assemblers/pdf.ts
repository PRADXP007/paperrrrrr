import { AssembleDocumentInput, DocumentSection } from "@/types/document";
import { cleanMarkdownFormatting, isMarkdownTable, preprocessVisualElements } from "./utils";
import PDFDocument from "pdfkit";
import { detectAndCreateDiagramsForSection, renderMermaidToPngBuffer } from "../diagrams";
import { tavily } from "@tavily/core";

export async function assemblePdfDocument(input: AssembleDocumentInput): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const PDFDocClass = typeof PDFDocument === "function" ? PDFDocument : (PDFDocument as any).default;
    const doc = new PDFDocClass({
      margin: 72, // Standard 1-inch margins
      size: "A4",
      bufferPages: true
    });
    const buffers: Buffer[] = [];

    doc.on("data", (chunk: any) => buffers.push(chunk));
    doc.on("end", () => {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Running Header (Pages 2+)
        if (i > 0) {
          doc.fillColor("#333333").font("Times-Italic").fontSize(9);
          doc.text(input.settings.title, 72, 36, { align: "right", width: 451 });
          doc.moveTo(72, 48).lineTo(523, 48).strokeColor("#000000").lineWidth(0.5).stroke();
        }

        // Running Footer with Page Numbers (All Pages)
        doc.fillColor("#555555").font("Times-Roman").fontSize(9);
        doc.text(`CONFIDENTIAL & ACADEMIC TREATISE`, 72, 780, { align: "left", width: 250 });
        doc.text(`Page ${i + 1} of ${range.count}`, 72, 780, { align: "right", width: 451 });
      }

      resolve(Buffer.concat(buffers));
    });
    doc.on("error", (err: any) => reject(err));

    // Cover / Title Page Block
    doc.fillColor("#000000").font("Times-Bold").fontSize(22).text(input.settings.title.toUpperCase(), { align: "center", lineGap: 6 });
    doc.moveDown(0.4);

    doc.fillColor("#333333").font("Times-Italic").fontSize(13).text(input.settings.subtitle, { align: "center", lineGap: 3 });
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

    for (const [idx, sec] of input.sections.entries()) {
      doc.fillColor("#000000").font("Times-Roman").fontSize(11);
      const titleStr = `${idx + 1}. ${sec.title.replace(/^\d+\.\s*/, "")}`;
      const pageStr = `Page ${idx + 1}`;
      const dotsCount = Math.max(3, Math.floor((451 - doc.widthOfString(titleStr) - doc.widthOfString(pageStr)) / doc.widthOfString(".")));
      const dotLine = " " + ".".repeat(dotsCount) + " ";
      doc.text(`${titleStr}${dotLine}${pageStr}`, { align: "justify", lineGap: 3 });
    }
    doc.moveDown(1.5);

    // Chapters & Subsections
    for (const [idx, sec] of input.sections.entries()) {
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

      let rawContent = sec.content || sec.brief || "";
      rawContent = await preprocessVisualElements(rawContent, sec.title);
      const paragraphs = rawContent.split("\n\n");
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

        if (pText.startsWith("[INJECTED_IMAGE_BASE64:")) {
          const match = pText.match(/\[INJECTED_IMAGE_BASE64:([^\]]+)\]/);
          if (match && match[1]) {
            try {
              const buffer = Buffer.from(match[1], "base64");
              if (doc.y > 550) doc.addPage();
              doc.image(buffer, {
                fit: [451, 300],
                align: 'center',
                valign: 'center'
              });
              doc.moveDown(0.5);
            } catch (e) {
              console.warn("Failed to inject image into PDF:", e);
            }
            return;
          }
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
    }

    doc.end();
  });
}