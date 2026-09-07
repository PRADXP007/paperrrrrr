import { AssembleDocumentInput, DocumentSection } from "@/types/document";
import { 
  toRomanNumeral, 
  parseParagraphsToDocx, 
  parseIEEEParagraphsToDocx, 
  isMarkdownTable, 
  parseMarkdownTableToDocx, 
  cleanMarkdownFormatting, 
  preprocessVisualElements,
    selectPPTXPalette
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

function parsePPTXSlideContent(sec: DocumentSection) {
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
  ppt.title = input.settings.title;

  const palette = selectPPTXPalette(input.settings.title, input.settings.accentColor);
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
  slide1.addText(input.settings.title, {
    x: 0.8, y: 1.3, w: 8.4, h: 1.8,
    fontFace: palette.headerFont, fontSize: 32, color: palette.textLight, bold: true, wrap: true, margin: 0
  });

  // Subtitle
  slide1.addText(input.settings.subtitle || "Comprehensive Strategic Assessment & Empirical Analysis", {
    x: 0.8, y: 3.2, w: 8.4, h: 0.8,
    fontFace: palette.bodyFont, fontSize: 14, color: palette.textLightMuted, italic: true, wrap: true, margin: 0
  });

  // Metadata Footer
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  slide1.addText(`Prepared by: ${input.settings.author || "Strategic Research Group"}   |   Date: ${dateStr}   |   16:9 Widescreen`, {
    x: 0.8, y: 4.7, w: 8.4, h: 0.4,
    fontFace: palette.bodyFont, fontSize: 10.5, color: palette.textLightMuted, margin: 0
  });

  slide1.addNotes(`Welcome everyone. Today we are presenting "${input.settings.title}". We will review the strategic background, empirical data, architectural mechanics, and actionable recommendations.`);

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
  slide2.addText(`Slide ${slideCounter}  |  ${input.settings.title.slice(0, 40)}`, {
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
          stat: highlightMetric ? (highlightMetric as string).split(" ")[0] : "+48.5%",
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
    slide.addText(`Slide ${slideCounter}  |  ${input.settings.title.slice(0, 40)}`, {
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