const path = require("path");
const pptxgen = require("pptxgenjs");

// Theme palette for Midnight Executive
const PALETTE = {
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
};

async function buildPowerPoint(outputFilename = "Paperrrrrr_Generated_Presentation.pptx") {
  console.log(`\n==================================================`);
  console.log(`📊 GENERATING PROFESSIONAL PPTX PRESENTATION DECK`);
  console.log(`==================================================\n`);

  const ppt = new pptxgen();
  ppt.layout = "LAYOUT_16x9"; // Standard 10.0" x 5.625"
  ppt.title = "Renewable Energy Adoption & 2030 Transition Strategy";

  // ----------------------------------------------------
  // SLIDE 1: Executive Title Slide (Dark Sandwich Cover)
  // ----------------------------------------------------
  const slide1 = ppt.addSlide();
  slide1.background = { color: PALETTE.darkBg };

  // Category Tag Pill
  slide1.addShape(ppt.ShapeType.roundRect, {
    x: 0.8, y: 0.7, w: 2.8, h: 0.32,
    fill: { color: PALETTE.cardDarkBg },
    line: { color: PALETTE.accent, width: 1 },
    rectRadius: 0.15
  });
  slide1.addText("EXECUTIVE STRATEGY DECK", {
    x: 0.8, y: 0.7, w: 2.8, h: 0.32,
    fontFace: PALETTE.bodyFont, fontSize: 9.5, color: PALETTE.accent, bold: true, align: "center", margin: 0
  });

  // Title
  slide1.addText("Renewable Energy Adoption in India", {
    x: 0.8, y: 1.3, w: 8.4, h: 1.8,
    fontFace: PALETTE.headerFont, fontSize: 32, color: PALETTE.textLight, bold: true, wrap: true, margin: 0
  });

  // Subtitle
  slide1.addText("A Strategic Roadmap & Empirical Analysis of 2030 Non-Fossil Generation Targets", {
    x: 0.8, y: 3.2, w: 8.4, h: 0.8,
    fontFace: PALETTE.bodyFont, fontSize: 14, color: PALETTE.textLightMuted, italic: true, wrap: true, margin: 0
  });

  // Metadata Footer
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  slide1.addText(`Prepared by: Strategic Energy Assessment Group   |   Date: ${dateStr}   |   16:9 Widescreen`, {
    x: 0.8, y: 4.7, w: 8.4, h: 0.4,
    fontFace: PALETTE.bodyFont, fontSize: 10.5, color: PALETTE.textLightMuted, margin: 0
  });

  slide1.addNotes("Welcome executive stakeholders. Today we present India's clean energy transition roadmap towards 500 GW non-fossil capacity by 2030.");

  // ----------------------------------------------------
  // SLIDE 2: Executive Agenda & Taxonomy (Light Canvas)
  // ----------------------------------------------------
  const slide2 = ppt.addSlide();
  slide2.background = { color: PALETTE.lightBg };

  slide2.addShape(ppt.ShapeType.roundRect, {
    x: 0.8, y: 0.45, w: 1.8, h: 0.28,
    fill: { color: PALETTE.cardLightBg },
    line: { color: PALETTE.secondary, width: 1 },
    rectRadius: 0.12
  });
  slide2.addText("TAXONOMY", {
    x: 0.8, y: 0.45, w: 1.8, h: 0.28,
    fontFace: PALETTE.bodyFont, fontSize: 9, color: PALETTE.secondary, bold: true, align: "center", margin: 0
  });

  slide2.addText("Executive Agenda & Section Roadmap", {
    x: 0.8, y: 0.8, w: 8.4, h: 0.5,
    fontFace: PALETTE.headerFont, fontSize: 20, color: PALETTE.textDark, bold: true, margin: 0
  });

  const agenda = [
    "1. Macro Ecosystem & 500 GW Target",
    "2. Empirical Benchmarks & Solar Capacity",
    "3. Storage Infrastructure & Grid Stability",
    "4. Phased Execution Milestones (2025-2030)"
  ];

  agenda.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const posX = col === 0 ? 0.8 : 5.1;
    const posY = 1.6 + (row * 0.9);

    slide2.addShape(ppt.ShapeType.roundRect, {
      x: posX, y: posY, w: 4.1, h: 0.7,
      fill: { color: PALETTE.cardLightBg },
      line: { color: PALETTE.cardBorder, width: 1 },
      rectRadius: 0.12
    });

    slide2.addText(String(idx + 1).padStart(2, "0"), {
      x: posX + 0.15, y: posY + 0.18, w: 0.4, h: 0.35,
      fontFace: PALETTE.bodyFont, fontSize: 13, color: PALETTE.secondary, bold: true, align: "center", margin: 0
    });

    slide2.addText(item.replace(/^\d+\.\s*/, ""), {
      x: posX + 0.6, y: posY + 0.18, w: 3.3, h: 0.35,
      fontFace: PALETTE.bodyFont, fontSize: 12, color: PALETTE.textDark, bold: true, margin: 0
    });
  });

  slide2.addNotes("Here is the executive agenda covering market dynamics, quantitative metrics, grid storage architecture, and deployment roadmaps.");
  slide2.addText(`Slide 2  |  Renewable Energy Strategy`, {
    x: 0.8, y: 5.15, w: 8.4, h: 0.3,
    fontFace: PALETTE.bodyFont, fontSize: 8.5, color: PALETTE.textMuted, align: "right", margin: 0
  });

  // ----------------------------------------------------
  // SLIDE 3: Layout B (3-Card Big Stat & KPI Highlights)
  // ----------------------------------------------------
  const slide3 = ppt.addSlide();
  slide3.background = { color: PALETTE.lightBg };

  slide3.addShape(ppt.ShapeType.roundRect, {
    x: 0.8, y: 0.45, w: 1.4, h: 0.26,
    fill: { color: PALETTE.cardLightBg },
    line: { color: PALETTE.secondary, width: 1 },
    rectRadius: 0.1
  });
  slide3.addText("SECTION 2", {
    x: 0.8, y: 0.45, w: 1.4, h: 0.26,
    fontFace: PALETTE.bodyFont, fontSize: 8.5, color: PALETTE.secondary, bold: true, align: "center", margin: 0
  });

  slide3.addText("Empirical Benchmarks & Capacity Trajectory", {
    x: 0.8, y: 0.78, w: 8.4, h: 0.48,
    fontFace: PALETTE.headerFont, fontSize: 19, color: PALETTE.textDark, bold: true, margin: 0
  });

  const stats = [
    { label: "INSTALLED CAPACITY", stat: "190+ GW", desc: "Non-fossil installed generation capacity achieved by 2024, representing 4th global ranking." },
    { label: "2030 TARGET", stat: "500 GW", desc: "Committed non-fossil capacity mandate covering over 50% of total national electricity demand." },
    { label: "ANNUAL ADDITIONS", stat: "35 GW/yr", desc: "Target annual bidding and installation trajectory required to bridge the 2030 capacity curve." }
  ];

  stats.forEach((card, cIdx) => {
    const posX = 0.8 + (cIdx * 2.9);
    slide3.addShape(ppt.ShapeType.roundRect, {
      x: posX, y: 1.45, w: 2.65, h: 3.5,
      fill: { color: PALETTE.cardLightBg },
      line: { color: PALETTE.cardBorder, width: 1 },
      rectRadius: 0.15
    });

    slide3.addText(card.label, {
      x: posX + 0.2, y: 1.7, w: 2.25, h: 0.25,
      fontFace: PALETTE.bodyFont, fontSize: 8.5, color: PALETTE.secondary, bold: true, margin: 0
    });

    slide3.addText(card.stat, {
      x: posX + 0.2, y: 2.05, w: 2.25, h: 0.7,
      fontFace: PALETTE.headerFont, fontSize: 28, color: PALETTE.primary, bold: true, margin: 0
    });

    slide3.addText(card.desc, {
      x: posX + 0.2, y: 2.85, w: 2.25, h: 1.8,
      fontFace: PALETTE.bodyFont, fontSize: 11, color: PALETTE.textDark, wrap: true, margin: 0
    });
  });

  slide3.addNotes("India currently ranks 4th globally in installed renewable capacity with an aggressive 35 GW annual addition trajectory to hit the 500 GW target.");
  slide3.addText(`Slide 3  |  Renewable Energy Strategy`, {
    x: 0.8, y: 5.15, w: 8.4, h: 0.3,
    fontFace: PALETTE.bodyFont, fontSize: 8.5, color: PALETTE.textMuted, align: "right", margin: 0
  });

  // ----------------------------------------------------
  // SLIDE 4: Layout A (Split Two-Column Focus & Insights)
  // ----------------------------------------------------
  const slide4 = ppt.addSlide();
  slide4.background = { color: PALETTE.lightBg };

  slide4.addShape(ppt.ShapeType.roundRect, {
    x: 0.8, y: 0.45, w: 1.4, h: 0.26,
    fill: { color: PALETTE.cardLightBg },
    line: { color: PALETTE.secondary, width: 1 },
    rectRadius: 0.1
  });
  slide4.addText("SECTION 3", {
    x: 0.8, y: 0.45, w: 1.4, h: 0.26,
    fontFace: PALETTE.bodyFont, fontSize: 8.5, color: PALETTE.secondary, bold: true, align: "center", margin: 0
  });

  slide4.addText("Grid Stability & Battery Energy Storage Systems (BESS)", {
    x: 0.8, y: 0.78, w: 8.4, h: 0.48,
    fontFace: PALETTE.headerFont, fontSize: 19, color: PALETTE.textDark, bold: true, margin: 0
  });

  // Left Focus Card
  slide4.addShape(ppt.ShapeType.roundRect, {
    x: 0.8, y: 1.45, w: 2.8, h: 3.5,
    fill: { color: PALETTE.cardLightBg },
    line: { color: PALETTE.cardBorder, width: 1 },
    rectRadius: 0.15
  });

  slide4.addText("EXECUTIVE FOCUS", {
    x: 1.0, y: 1.65, w: 2.4, h: 0.25,
    fontFace: PALETTE.bodyFont, fontSize: 9, color: PALETTE.secondary, bold: true, margin: 0
  });

  slide4.addText("Intermittent solar and wind output necessitates rapid deployment of grid-scale energy storage and round-the-clock (RTC) green power supply.", {
    x: 1.0, y: 2.0, w: 2.4, h: 1.5,
    fontFace: PALETTE.bodyFont, fontSize: 11, color: PALETTE.textDark, italic: true, wrap: true, margin: 0
  });

  slide4.addShape(ppt.ShapeType.roundRect, {
    x: 1.0, y: 3.65, w: 2.4, h: 1.05,
    fill: { color: PALETTE.lightBg },
    line: { color: PALETTE.accent, width: 1 },
    rectRadius: 0.1
  });
  slide4.addText("STORAGE MANDATE", {
    x: 1.1, y: 3.75, w: 2.2, h: 0.2,
    fontFace: PALETTE.bodyFont, fontSize: 8, color: PALETTE.secondary, bold: true, margin: 0
  });
  slide4.addText("47 GW / 236 GWh BESS Required by 2032 (CEA Report)", {
    x: 1.1, y: 4.0, w: 2.2, h: 0.6,
    fontFace: PALETTE.headerFont, fontSize: 11, color: PALETTE.primary, bold: true, wrap: true, margin: 0
  });

  // Right Takeaways Card
  slide4.addShape(ppt.ShapeType.roundRect, {
    x: 3.8, y: 1.45, w: 5.4, h: 3.5,
    fill: { color: PALETTE.lightBg },
    line: { color: PALETTE.cardBorder, width: 1 },
    rectRadius: 0.15
  });

  slide4.addText("STRATEGIC FINDINGS & EMPIRICAL EVIDENCE", {
    x: 4.05, y: 1.65, w: 4.9, h: 0.25,
    fontFace: PALETTE.bodyFont, fontSize: 9, color: PALETTE.primary, bold: true, margin: 0
  });

  const findings = [
    "Pumped Hydro vs Lithium-ion: 18.8 GW pumped storage capacity identified across 47 designated river basin projects.",
    "Viability Gap Funding (VGF): Government sanction of 4,000 MWh battery storage capital subsidies to lower tariff thresholds.",
    "Green Energy Corridors: Phase-II inter-state transmission lines expanding to evacuate 20,000 MW renewable power."
  ];

  const bulletItems = findings.map((text) => ({
    text,
    options: {
      bullet: true,
      fontFace: PALETTE.bodyFont,
      fontSize: 11.5,
      color: PALETTE.textDark,
      paraSpaceAfter: 12
    }
  }));

  slide4.addText(bulletItems, {
    x: 4.05, y: 2.05, w: 4.9, h: 2.65,
    margin: 0
  });

  slide4.addNotes("Grid storage is the critical bottleneck. The CEA projects 236 GWh of battery storage combined with 18.8 GW pumped hydro to ensure stable peak-load delivery.");
  slide4.addText(`Slide 4  |  Renewable Energy Strategy`, {
    x: 0.8, y: 5.15, w: 8.4, h: 0.3,
    fontFace: PALETTE.bodyFont, fontSize: 8.5, color: PALETTE.textMuted, align: "right", margin: 0
  });

  // ----------------------------------------------------
  // SLIDE 5: Concluding Slide (Dark Sandwich Back)
  // ----------------------------------------------------
  const slide5 = ppt.addSlide();
  slide5.background = { color: PALETTE.darkBg };

  slide5.addShape(ppt.ShapeType.roundRect, {
    x: 0.8, y: 0.8, w: 2.6, h: 0.32,
    fill: { color: PALETTE.cardDarkBg },
    line: { color: PALETTE.accent, width: 1 },
    rectRadius: 0.15
  });
  slide5.addText("STRATEGIC VERDICT", {
    x: 0.8, y: 0.8, w: 2.6, h: 0.32,
    fontFace: PALETTE.bodyFont, fontSize: 9.5, color: PALETTE.accent, bold: true, align: "center", margin: 0
  });

  slide5.addText("Synthesis & Strategic Directives", {
    x: 0.8, y: 1.4, w: 8.4, h: 0.8,
    fontFace: PALETTE.headerFont, fontSize: 28, color: PALETTE.textLight, bold: true, margin: 0
  });

  slide5.addText("Achieving 500 GW non-fossil capacity is economically viable and structurally feasible through coordinated tariff reforms, domestic cell manufacturing, and dedicated storage infrastructure.", {
    x: 0.8, y: 2.3, w: 8.4, h: 0.9,
    fontFace: PALETTE.bodyFont, fontSize: 13, color: PALETTE.textLightMuted, italic: true, wrap: true, margin: 0
  });

  slide5.addShape(ppt.ShapeType.roundRect, {
    x: 0.8, y: 3.5, w: 8.4, h: 1.1,
    fill: { color: PALETTE.cardDarkBg },
    line: { color: PALETTE.accent, width: 1 },
    rectRadius: 0.15
  });

  slide5.addText("Thank You   •   Questions & Discussion", {
    x: 0.8, y: 3.65, w: 8.4, h: 0.4,
    fontFace: PALETTE.bodyFont, fontSize: 16, color: PALETTE.accent, bold: true, align: "center", margin: 0
  });
  slide5.addText("Prepared for institutional review and executive policymaking.", {
    x: 0.8, y: 4.1, w: 8.4, h: 0.35,
    fontFace: PALETTE.bodyFont, fontSize: 11, color: PALETTE.textLightMuted, align: "center", margin: 0
  });

  slide5.addNotes("Thank you for your attention. We welcome questions regarding auction designs, capital financing, and storage integration.");

  const outputPath = path.join(__dirname, outputFilename);
  await ppt.writeFile({ fileName: outputPath });
  console.log(`✅ Standard Modern PowerPoint presentation successfully generated!`);
  console.log(`📁 File saved to: ${outputPath}`);
}

buildPowerPoint();
