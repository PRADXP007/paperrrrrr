import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { ResearchBundle, ResearchSnippet } from "./tavily";

export interface OutlineSubsection {
  id: string;
  title: string;
  brief: string;
  keyPoints?: string[];
  content?: string;
}

export interface OutlineSection {
  id: string;
  title: string;
  brief: string;
  keyPoints: string[];
  relevantSourceIndices: number[];
  subsections?: OutlineSubsection[];
  content?: string;
  status?: "pending" | "generating" | "completed";
}

export interface GeneratedOutline {
  title: string;
  subtitle: string;
  docType: string;
  format: "docx" | "pptx" | "pdf";
  targetLength: string;
  chapters?: OutlineSection[];
  sections: OutlineSection[];
}

export interface GenerateOutlineOptions {
  format?: string;
  tone?: string;
  audience?: string;
  targetLength?: string;
  docType?: string;
  customGeminiKey?: string;
  customOpenAIKey?: string;
  geminiModel?: string;
  referenceNotes?: string;
  isFormalAcademicReport?: boolean;
  institutionName?: string;
  department?: string;
  degree?: string;
  submittedBy?: string;
  guideName?: string;
  pageCount?: number;
  customChapterCount?: number;
  font?: string;
  accentColor?: string;
  additionalRequirements?: string;
}

export interface DocumentBudget {
  pageCount: number;
  font: string;
  wordsPerPage: number;
  totalTargetWords: number;
  chapterCount: number;
  wordsPerChapterTarget: number;
  subsectionsPerChapterMin: number;
  subsectionsPerChapterMax: number;
  label: string;
}

export function getWordsPerPageForFont(font: string = "Times New Roman"): number {
  const f = font.toLowerCase();
  if (f.includes("arial") || f.includes("georgia")) return 255;
  if (f.includes("calibri") || f.includes("cambria")) return 265;
  return 275; // Times New Roman standard at 12pt, 1.5 line spacing, 1-inch margins
}

export function calculateDocumentBudget(
  promptText: string = "",
  options: {
    pageCount?: number;
    customChapterCount?: number;
    font?: string;
    targetLength?: string;
  } = {}
): DocumentBudget {
  const selectedFont = options.font || "Times New Roman";
  const wordsPerPage = getWordsPerPageForFont(selectedFont);

  // 1. Check explicit page count from settings panel or prompt
  let pages = options.pageCount && options.pageCount > 0 ? options.pageCount : 0;
  if (!pages) {
    const combined = `${promptText} ${options.targetLength || ""}`.toLowerCase();
    const pageMatch = combined.match(/\b(\d+)\s*(?:[- ]?pages?|pgs?|page\b)/i);
    if (pageMatch) {
      pages = parseInt(pageMatch[1], 10);
    } else {
      const wordMatch = combined.match(/\b(\d+(?:,\d+)?|\d+k)\s*(?:words?)\b/i);
      if (wordMatch) {
        const raw = wordMatch[1].replace(/,/g, "").toLowerCase();
        const words = raw.endsWith("k") ? parseFloat(raw.slice(0, -1)) * 1000 : parseInt(raw, 10);
        pages = Math.max(1, Math.round(words / wordsPerPage));
      }
    }
  }

  if (!pages || pages <= 0) {
    pages = 15; // default reasonable academic report length
  }

  // Remove ceiling: allow any positive page count requested by user (1 to 500+)
  pages = Math.max(1, pages);
  const totalTargetWords = Math.round(pages * wordsPerPage);

  // Determine chapter count: user specified or calculated based on page count
  let chapters = options.customChapterCount && options.customChapterCount > 0 ? options.customChapterCount : 0;
  if (!chapters) {
    if (pages >= 150) {
      chapters = 28;
    } else if (pages >= 80) {
      chapters = 20;
    } else if (pages >= 50) {
      chapters = 16;
    } else if (pages >= 30) {
      chapters = 14;
    } else if (pages >= 20) {
      chapters = 10;
    } else if (pages >= 12) {
      chapters = 8;
    } else if (pages >= 6) {
      chapters = 6;
    } else if (pages >= 3) {
      chapters = 4;
    } else {
      chapters = 3;
    }
  }

  // Allow chapters to scale proportionally
  chapters = Math.max(2, chapters);
  const wordsPerChapter = Math.round(totalTargetWords / chapters);

  let subMin = 2;
  let subMax = 4;
  if (pages >= 50) {
    subMin = 4;
    subMax = 6;
  } else if (pages >= 25) {
    subMin = 3;
    subMax = 5;
  } else if (pages <= 5) {
    subMin = 2;
    subMax = 3;
  }

  return {
    pageCount: pages,
    font: selectedFont,
    wordsPerPage,
    totalTargetWords,
    chapterCount: chapters,
    wordsPerChapterTarget: wordsPerChapter,
    subsectionsPerChapterMin: subMin,
    subsectionsPerChapterMax: subMax,
    label: `Manuscript Target: ${pages} Pages (~${totalTargetWords.toLocaleString()} Words across ${chapters} Chapters)`
  };
}

export function parseTargetLengthSpecs(promptText: string = "", targetLengthOption?: string): DocumentBudget {
  return calculateDocumentBudget(promptText, { targetLength: targetLengthOption });
}

/**
 * Builds a dynamic, docType-specific outline directly from user input and research bundle
 */
export function buildDynamicOutline(
  prompt: string,
  options: GenerateOutlineOptions = {},
  researchBundle?: ResearchBundle
): GeneratedOutline {
  const cleanTitle = prompt.replace(/\.$/, "").trim();
  const capitalizedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  const docType = options.docType || "Research Report";
  const srcCount = researchBundle?.results?.length || 1;
  const lengthSpec = calculateDocumentBudget(prompt, options);
  const isExhaustive = lengthSpec.pageCount >= 30 || (options.targetLength || "").toLowerCase().includes("unlimited") || (options.targetLength || "").toLowerCase().includes("detailed") || options.format === "docx" || options.format === "pdf";

  let subtitle = "";
  let sections: OutlineSection[] = [];

  if (options.format === "pptx") {
    subtitle = `Executive 16:9 Presentation Slide Deck (${options.tone || "Executive & Direct"})`;
    sections = [
      {
        id: "slide_1",
        title: "Slide 1: Executive Title & Strategic Thesis",
        brief: `High-impact title slide framing the strategic thesis, core scope, and market context for ${cleanTitle}.`,
        keyPoints: [`Strategic positioning statement for ${cleanTitle}`, "Executive authorship & date metadata", "Core presentation thesis"],
        relevantSourceIndices: [1]
      },
      {
        id: "slide_2",
        title: "Slide 2: Market Landscape & Growth Opportunity",
        brief: `Macro ecosystem dynamics, CAGR growth trajectory, and total addressable opportunity for ${cleanTitle}.`,
        keyPoints: ["Global market size and 5-year CAGR metrics", "Macro economic tailwinds and regulatory drivers", "Key institutional and demographic segments"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1]
      },
      {
        id: "slide_3",
        title: "Slide 3: Core Problem Statement & Market Inefficiencies",
        brief: `Granular analysis of existing bottlenecks, cost friction, and systemic vulnerabilities addressed by ${cleanTitle}.`,
        keyPoints: ["Top 3 friction points in current operations", "Quantified cost of inefficiency and legacy debt", "Emerging urgency and inflection triggers"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1]
      },
      {
        id: "slide_4",
        title: "Slide 4: Strategic Solution & Architectural Paradigm",
        brief: `Core value proposition, architectural innovation, and operational transformation delivered by ${cleanTitle}.`,
        keyPoints: ["Pivotal functional capabilities", "Efficiency gains and performance multipliers", "Deployment flexibility across enterprise workflows"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1]
      },
      {
        id: "slide_5",
        title: "Slide 5: Technical Infrastructure & System Workflows",
        brief: `High-level system topology, data integration pipelines, and scalability protocols supporting ${cleanTitle}.`,
        keyPoints: ["Core technology stack and protocol standards", "Data latency, security, and uptime SLA parameters", "API interoperability and legacy integration"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1]
      },
      {
        id: "slide_6",
        title: "Slide 6: Empirical Benchmarks & Quantitative Impact",
        brief: `Verified data points, institutional performance metrics, and measured outcomes in ${cleanTitle}.`,
        keyPoints: ["Statistical performance improvements", "Unit economic optimization metrics", "Comparative efficiency against historical baselines"],
        relevantSourceIndices: srcCount >= 4 ? [3, 4] : [srcCount]
      },
      {
        id: "slide_7",
        title: "Slide 7: Business Model, Monetization & Unit Economics",
        brief: `Revenue mechanisms, pricing architecture, margin structure, and payback periods for ${cleanTitle}.`,
        keyPoints: ["Primary and secondary monetization streams", "Gross margins and contribution economics", "Customer lifetime value (LTV) to CAC ratio"],
        relevantSourceIndices: srcCount >= 4 ? [2, 3, 4] : [1, 2]
      },
      {
        id: "slide_8",
        title: "Slide 8: Competitive Matrix & Defensive Moat",
        brief: `Market positioning, comparative quadrant analysis, and sustainable competitive advantages in ${cleanTitle}.`,
        keyPoints: ["Feature-by-feature quadrant comparison", "Defensive network effects and proprietary IP", "Switching costs and distribution advantages"],
        relevantSourceIndices: srcCount >= 4 ? [1, 3, 4] : [1, 2]
      },
      {
        id: "slide_9",
        title: "Slide 9: Phased Execution Roadmap & Timelines",
        brief: `Near-term milestones, mid-term scaling phases, and long-term ecosystem expansion for ${cleanTitle}.`,
        keyPoints: ["Phase 1 (Months 1–6): Pilot & Validation", "Phase 2 (Months 7–18): Scaling & Enterprise Rollout", "Phase 3 (Months 19–36): Ecosystem Leadership & Expansion"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1, 2]
      },
      {
        id: "slide_10",
        title: "Slide 10: Risk Governance & Mitigation Strategy",
        brief: `Systematic risk scoring, compliance standards, and contingency playbooks for ${cleanTitle}.`,
        keyPoints: ["Regulatory, operational, and security risk vectors", "Active mitigation and redundancy safeguards", "Ongoing compliance and audit framework"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 4] : [1]
      },
      {
        id: "slide_11",
        title: "Slide 11: 5-Year Financial & Impact Projections",
        brief: `Multi-year revenue forecasts, capital deployment requirements, and milestone target matrix for ${cleanTitle}.`,
        keyPoints: ["5-year revenue and volume growth trajectories", "Operating expenditure vs capital investment", "Target ROI and break-even milestones"],
        relevantSourceIndices: srcCount >= 4 ? [2, 3, 4] : [1, 2]
      },
      {
        id: "slide_12",
        title: "Slide 12: Executive Summary & Call to Action",
        brief: `Synthesized key takeaways, strategic verdict, and definitive next steps for ${cleanTitle}.`,
        keyPoints: ["Core strategic verdict summary", "Immediate resource and partner requirements", "Contact, Q&A, and governance checkpoints"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1, 2]
      }
    ];
  } else if (docType === "Research Paper" || docType === "IEEE Research Paper" || cleanTitle.toLowerCase().includes("ieee") || (cleanTitle.toLowerCase().includes("research paper") && options.format !== "pptx")) {
    subtitle = `IEEE Conference & Journal Standard Manuscript`;
    sections = [
      {
        id: "sec_abstract",
        title: "Abstract & Keywords",
        brief: `Comprehensive 150-250 word scholarly abstract framing the domain context, problem statement, methodological innovation, empirical results, and significance for ${cleanTitle}.`,
        keyPoints: ["Background & problem motivation", "Proposed architectural or theoretical framework", "Quantitative benchmark results & efficiency gains", "Index keywords & domain taxonomy"],
        relevantSourceIndices: [1]
      },
      {
        id: "sec_1",
        title: "I. INTRODUCTION",
        brief: `Contextual background, domain urgency, formal problem formulation, key contributions, and paper organization for ${cleanTitle}.`,
        keyPoints: ["Historical & industrial context", "Core challenges & baseline limitations", "Explicit itemized list of research contributions", "Paper structural roadmap"],
        relevantSourceIndices: [1, 2],
        subsections: [
          { id: "sec_1_1", title: "A. Motivation and Domain Urgency", brief: `Contemporary technological and empirical drivers motivating innovation in ${cleanTitle}.` },
          { id: "sec_1_2", title: "B. Formal Problem Formulation", brief: `Mathematical and architectural definition of operational bottlenecks.` },
          { id: "sec_1_3", title: "C. Research Contributions & Organization", brief: `Itemized novel contributions and sequential structure of the manuscript.` }
        ]
      },
      {
        id: "sec_2",
        title: "II. RELATED WORK & THEORETICAL FOUNDATIONS",
        brief: `Exhaustive taxonomy of existing literature, baseline algorithms, comparative paradigms, and identified gaps for ${cleanTitle}.`,
        keyPoints: ["Taxonomy of state-of-the-art literature", "Comparative analysis of prevailing paradigms", "Empirical gaps addressed by the proposed approach"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1],
        subsections: [
          { id: "sec_2_1", title: "A. Taxonomy of Prior Approaches", brief: `Classification and historical trajectory of existing models and methods.` },
          { id: "sec_2_2", title: "B. Baseline Limitations & Research Gaps", brief: `Critical analysis of vulnerabilities and computational bottlenecks in current paradigms.` }
        ]
      },
      {
        id: "sec_3",
        title: "III. PROPOSED SYSTEM METHODOLOGY & ARCHITECTURE",
        brief: `Rigorous mathematical formulation, algorithmic pipelines, component modules, and optimization protocols for ${cleanTitle}.`,
        keyPoints: ["Mathematical formulation & system equations", "Architectural schematic & data pipelines", "Optimization theorems & algorithmic complexity"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_3_1", title: "A. Mathematical Formulation & System Model", brief: `Formal mathematical equations, parameter notations, and boundary constraints.` },
          { id: "sec_3_2", title: "B. Architectural Pipeline & Module Topology", brief: `Detailed component interactions, data flow representations, and protocols.` },
          { id: "sec_3_3", title: "C. Algorithmic Complexity & Execution Safeguards", brief: `Time/space complexity analysis and convergence guarantees.` }
        ]
      },
      {
        id: "sec_4",
        title: "IV. EXPERIMENTAL SETUP & EMPIRICAL RESULTS",
        brief: `Quantitative testbed benchmarks, comparative baseline distributions, evaluation metrics, and ablation data for ${cleanTitle}.`,
        keyPoints: ["Experimental testbed & dataset specifications", "Comparative benchmark tables against state-of-the-art", "Statistical significance & runtime latency"],
        relevantSourceIndices: srcCount >= 3 ? [1, 2, 3] : [1],
        subsections: [
          { id: "sec_4_1", title: "A. Benchmark Testbeds & Dataset Synthesis", brief: `Experimental parameters, baseline configurations, and hardware/software setup.` },
          { id: "sec_4_2", title: "B. Quantitative Benchmark Evaluation", brief: `Granular comparison tables evaluating accuracy, throughput, and efficiency.` },
          { id: "sec_4_3", title: "C. Statistical Significance & Latency Analysis", brief: `Empirical distributions, p-values, and convergence rates across iterations.` }
        ]
      },
      {
        id: "sec_5",
        title: "V. DISCUSSION, ABLATION ANALYSIS & THREATS TO VALIDITY",
        brief: `In-depth ablation studies, architectural trade-offs, internal/external validity constraints, and practical deployment considerations.`,
        keyPoints: ["Component-by-component ablation studies", "Operational trade-offs and computational costs", "Threats to internal and external validity"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_5_1", title: "A. Ablation Experiments & Component Impact", brief: `Empirical isolation of individual system components and their contributions.` },
          { id: "sec_5_2", title: "B. Critical Trade-offs & Deployment Constraints", brief: `Practical latency, memory, and bandwidth trade-offs in production.` },
          { id: "sec_5_3", title: "C. Threats to Validity", brief: `Analysis of confounding variables and generalizability across diverse domains.` }
        ]
      },
      {
        id: "sec_6",
        title: "VI. CONCLUSION & FUTURE WORK",
        brief: `Scholarly synthesis of findings, verified impact on the research community, and high-priority open research directions for ${cleanTitle}.`,
        keyPoints: ["Summary of verified empirical outcomes", "Key theoretical and engineering implications", "Prospective research avenues for future scholars"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1]
      }
    ];
  } else if (lengthSpec.pageCount >= 30) {
    subtitle = `An Exhaustive Multi-Chapter Treatise (${lengthSpec.label})`;
    sections = [
      {
        id: "sec_1",
        title: "1. Introduction & Foundational Scope",
        brief: `Executive introduction to baseline metrics, institutional significance, and scope of inquiry for ${cleanTitle}.`,
        keyPoints: [`Contextual background and domain importance`, "Core problem definition and inefficiencies", "Scope boundaries and project objectives"],
        relevantSourceIndices: [1],
        subsections: [
          { id: "sec_1_1", title: "1.1 Background and Domain Urgency", brief: `Historical and contemporary context motivating research in ${cleanTitle}.` },
          { id: "sec_1_2", title: "1.2 Formal Problem Statement", brief: `Detailed breakdown of structural inefficiencies and technical bottlenecks.` },
          { id: "sec_1_3", title: "1.3 Research Aims and Inquiries", brief: `Specific analytical questions, hypotheses, and scope boundaries.` },
          { id: "sec_1_4", title: "1.4 Methodological Contributions", brief: `Expected empirical deliverables and scholarly taxonomy contributions.` }
        ]
      },
      {
        id: "sec_2",
        title: "2. Historical Genesis & Evolutionary Inflection Points",
        brief: `Chronological maturation, early developmental milestones, and structural inflection points of ${cleanTitle}.`,
        keyPoints: ["Early developmental phases", "Major historical inflection points", "Structural evolution of the ecosystem"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1],
        subsections: [
          { id: "sec_2_1", title: "2.1 Early Developmental Phases", brief: `Pioneering initiatives, early prototypes, and initial standardizations.` },
          { id: "sec_2_2", title: "2.2 Decade-Long Inflection Points", brief: `Critical technological pivots, catalysts, and paradigm transitions.` },
          { id: "sec_2_3", title: "2.3 Contemporary Ecosystem Maturation", brief: `Current state of global adoption and operational scaling.` }
        ]
      },
      {
        id: "sec_3",
        title: "3. Literature Survey & Theoretical Frameworks",
        brief: `Exhaustive analysis of seminal scholarship, prevailing conceptual models, and academic debates.`,
        keyPoints: ["Seminal theoretical models", "Taxonomy of existing research streams", "Critical counter-perspectives"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1],
        subsections: [
          { id: "sec_3_1", title: "3.1 Theoretical Taxonomy & Conceptual Models", brief: `Classification of prevailing mathematical and operational frameworks.` },
          { id: "sec_3_2", title: "3.2 Comparative Analysis of Prior Literature", brief: `Critical synthesis of empirical findings across leading studies.` },
          { id: "sec_3_3", title: "3.3 Unresolved Theoretical Blind Spots", brief: `Systematic evaluation of research gaps and unanswered inquiries.` }
        ]
      },
      {
        id: "sec_4",
        title: "4. Methodological Design & Empirical Framework",
        brief: `Systematic selection criteria, measurement protocols, and quantitative evaluation indices for ${cleanTitle}.`,
        keyPoints: ["Sampling protocols and dataset verification", "Mathematical metric formulations", "Validity and reproducibility controls"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_4_1", title: "4.1 Dataset Selection & Sampling Parameters", brief: `Inclusion criteria, verification protocols, and corpus integrity.` },
          { id: "sec_4_2", title: "4.2 Quantitative Metrics & Mathematical Formulations", brief: `Formulas for yield tracking, latency, error bounds, and CAGR.` },
          { id: "sec_4_3", title: "4.3 Internal & External Validity Safeguards", brief: `Controls for systematic bias, noise isolation, and reproducibility.` }
        ]
      },
      {
        id: "sec_5",
        title: "5. High-Level Architectural Topology",
        brief: `Core system topology, component modularity, and operational workflow design.`,
        keyPoints: ["Modular component hierarchy", "Communication bus and data interchange", "High-throughput operational topology"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_5_1", title: "5.1 Structural Component Hierarchy", brief: `Decomposition of functional sub-modules and core engine components.` },
          { id: "sec_5_2", title: "5.2 Inter-Module Protocols & Synchronization", brief: `Message bus, event dispatching, and state synchronization.` },
          { id: "sec_5_3", title: "5.3 Pipeline Latency & Throughput Guarantees", brief: `Optimization techniques for high-concurrency throughput.` }
        ]
      },
      {
        id: "sec_6",
        title: "6. Data Pipelines & Protocol Standardization",
        brief: `Data ingestion, processing pipeline, and protocol harmonization standards.`,
        keyPoints: ["Data transformation pipelines", "Standardization and schema validation", "Auditability and provenance tracking"],
        relevantSourceIndices: srcCount >= 3 ? [1, 3] : [1],
        subsections: [
          { id: "sec_6_1", title: "6.1 Ingestion Protocols & Parsing Pipelines", brief: `Streaming ingestion mechanisms and schema validation rules.` },
          { id: "sec_6_2", title: "6.2 Data Integrity & Provenance Tracking", brief: `Cryptographic hashes, audit trails, and immutable logs.` },
          { id: "sec_6_3", title: "6.3 Cross-Platform Protocol Interoperability", brief: `Harmonization across heterogeneous third-party interfaces.` }
        ]
      },
      {
        id: "sec_7",
        title: "7. Security Architecture & Fault-Tolerance Mechanisms",
        brief: `Redundancy safeguards, cryptographic integrity, and disaster recovery.`,
        keyPoints: ["Zero-trust protocols", "High-availability failover mechanisms", "Threat modeling and intrusion defense"],
        relevantSourceIndices: srcCount >= 4 ? [2, 4] : [1],
        subsections: [
          { id: "sec_7_1", title: "7.1 Threat Vector Modeling & Surface Analysis", brief: `Comprehensive taxonomy of adversarial vulnerabilities and defense strategies.` },
          { id: "sec_7_2", title: "7.2 Distributed Redundancy & Failover Protocols", brief: `Automatic failover, partition tolerance, and self-healing state engines.` },
          { id: "sec_7_3", title: "7.3 Cryptographic Integrity & Access Governance", brief: `Role-based access control, cryptographic verification, and secret management.` }
        ]
      },
      {
        id: "sec_8",
        title: "8. Quantitative Empirical Findings & Benchmark Synthesis",
        brief: `Deep data synthesis with structured comparison tables, verified institutional statistics, and performance distributions.`,
        keyPoints: ["Granular statistical distributions", "Comparative benchmark tables", "Multi-variable statistical significance tests"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1],
        subsections: [
          { id: "sec_8_1", title: "8.1 Baseline vs Achieved Metric Distributions", brief: `Empirical performance distributions across representative testbeds.` },
          { id: "sec_8_2", title: "8.2 Multi-Variable Benchmark Data Tables", brief: `Structured Markdown comparison tables assessing throughput, cost, and yield.` },
          { id: "sec_8_3", title: "8.3 Statistical Significance & Dispersion Analysis", brief: `Hypothesis validation, p-value calculations, and sensitivity matrices.` }
        ]
      },
      {
        id: "sec_9",
        title: "9. Comparative Institutional Case Studies",
        brief: `Exhaustive real-world case evaluations demonstrating concrete implementations and institutional outcomes.`,
        keyPoints: ["Enterprise-scale case evaluation", "Public sector/academic deployment review", "Failure post-mortems and key lessons"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_9_1", title: "9.1 Enterprise Tier Implementation Review", brief: `Large-scale deployment outcomes, timeline analysis, and measured ROI.` },
          { id: "sec_9_2", title: "9.2 Public Sector & Institutional Deployments", brief: `Academic and regulatory consortium deployments and compliance.` },
          { id: "sec_9_3", title: "9.3 Post-Mortem Analysis of Observed Failures", brief: `Analysis of implementation friction, failed assumptions, and remedies.` }
        ]
      },
      {
        id: "sec_10",
        title: "10. Economic Feasibility, Unit Economics & TCO Modeling",
        brief: `Granular financial modeling, capital allocation efficiency, ROI, and total cost of ownership.`,
        keyPoints: ["Unit economics breakdown", "CAPEX vs OPEX projections", "Long-term Net Present Value (NPV) modeling"],
        relevantSourceIndices: srcCount >= 3 ? [1, 3] : [1],
        subsections: [
          { id: "sec_10_1", title: "10.1 Unit Cost Drivers & Marginal Economics", brief: `Granular cost breakdown per transaction/compute unit.` },
          { id: "sec_10_2", title: "10.2 Total Cost of Ownership (5-Year Model)", brief: `CAPEX requirements, operational staffing, and infrastructure overhead.` },
          { id: "sec_10_3", title: "10.3 Net Present Value & Payback Horizon", brief: `Discounted cash flow projections and capital break-even calculations.` }
        ]
      },
      {
        id: "sec_11",
        title: "11. Global Regulatory Frameworks & Compliance Policies",
        brief: `Jurisdictional compliance requirements, global policy treaties, and statutory mandates.`,
        keyPoints: ["Cross-border statutory compliance", "Liability protocols and audit mandates", "2026-2030 regulatory trajectory"],
        relevantSourceIndices: srcCount >= 4 ? [1, 4] : [1],
        subsections: [
          { id: "sec_11_1", title: "11.1 Cross-Jurisdictional Statutory Landscape", brief: `Regulatory analysis across US, EU, and APAC administrative bodies.` },
          { id: "sec_11_2", title: "11.2 Compliance Checkpoints & Audit Mandates", brief: `Continuous audit protocols and institutional liability management.` },
          { id: "sec_11_3", title: "11.3 Emerging Policy Directives (2026–2030)", brief: `Anticipated legislative shifts and prospective regulatory safeguards.` }
        ]
      },
      {
        id: "sec_12",
        title: "12. Phased Strategic Execution Roadmap",
        brief: `Actionable phased implementation timeline, capital deployment sequencing, and governance checkpoints.`,
        keyPoints: ["Near-term tactical rollout (Months 1–12)", "Medium-term scaling (Years 2–3)", "Long-term institutional governance (Years 4–5)"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_12_1", title: "12.1 Phase I: Foundation & Validation (Months 1–12)", brief: `Immediate technical priorities, pilot validation, and initial deployment.` },
          { id: "sec_12_2", title: "12.2 Phase II: Optimization & Scale (Years 2–3)", brief: `Full-scale system scaling, feature maturity, and ecosystem growth.` },
          { id: "sec_12_3", title: "12.3 Phase III: Long-Term Maturation (Years 4–5)", brief: `Sustained institutional leadership, governance standardization, and audit.` }
        ]
      },
      {
        id: "sec_13",
        title: "13. Risk Governance & Contingency Protocol Matrix",
        brief: `Systematic risk mitigation matrix, regulatory defense strategies, and business continuity frameworks.`,
        keyPoints: ["Probability-impact scoring matrix", "Disaster recovery and fault-tolerance", "Continuous compliance monitoring"],
        relevantSourceIndices: srcCount >= 4 ? [1, 4] : [1],
        subsections: [
          { id: "sec_13_1", title: "13.1 Comprehensive Risk Scoring Matrix", brief: `Quantitative probability and impact evaluation across all risk vectors.` },
          { id: "sec_13_2", title: "13.2 Operational Contingency Playbooks", brief: `Immediate incident response playbooks for system outages and breaches.` },
          { id: "sec_13_3", title: "13.3 Continuous Governance & Audit Monitoring", brief: `Automated compliance monitoring and real-time governance metrics.` }
        ]
      },
      {
        id: "sec_14",
        title: "14. Scholarly Synthesis & Prospective Research Agenda",
        brief: `Synthesized resolution of core findings, academic contributions, and prospective research agenda.`,
        keyPoints: ["Integrated theoretical and empirical summary", "Core scholarly contributions", "Prospective research avenues for future investigators"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1],
        subsections: [
          { id: "sec_14_1", title: "14.1 Integrated Resolution of Findings", brief: `Synthesized summary of theoretical and empirical discoveries.` },
          { id: "sec_14_2", title: "14.2 Methodological & Practical Contributions", brief: `Key academic contributions and industry implications.` },
          { id: "sec_14_3", title: "14.3 Future Research Trajectory & Open Questions", brief: `High-priority research questions for upcoming investigators.` }
        ]
      }
    ];
  } else {
    sections = [
      {
        id: "sec_1",
        title: "1. Introduction & Foundational Scope",
        brief: `Comprehensive introduction to baseline metrics, institutional significance, and scope of inquiry for ${cleanTitle}.`,
        keyPoints: [`Contextual background and domain importance`, "Core problem definition and inefficiencies", "Scope boundaries and project objectives"],
        relevantSourceIndices: [1],
        subsections: [
          { id: "sec_1_1", title: "1.1 Background and Motivation", brief: `Historical and contemporary context motivating research in ${cleanTitle}.` },
          { id: "sec_1_2", title: "1.2 Problem Statement", brief: `Formal definition of core structural inefficiencies and challenges in ${cleanTitle}.` },
          { id: "sec_1_3", title: "1.3 Research Objectives & Project Scope", brief: `Specific analytical aims, inquiry boundaries, and targeted deliverables.` }
        ]
      },
      {
        id: "sec_2",
        title: "2. Literature Survey & Theoretical Frameworks",
        brief: `Chronological maturation, seminal scholarship, and theoretical paradigms governing ${cleanTitle}.`,
        keyPoints: ["Evolutionary inflection points over the past decade", "Seminal theoretical models and scholarly taxonomy", "Contemporary academic consensus and divergences"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1],
        subsections: [
          { id: "sec_2_1", title: "2.1 Historical Genesis & Inflection Points", brief: `Evolutionary milestones and early developmental phases of ${cleanTitle}.` },
          { id: "sec_2_2", title: "2.2 Theoretical Taxonomy & Conceptual Models", brief: `Taxonomy of prevailing academic models and frameworks.` },
          { id: "sec_2_3", title: "2.3 Gaps in Contemporary Literature", brief: `Unresolved empirical questions and theoretical blind spots.` }
        ]
      },
      {
        id: "sec_3",
        title: "3. Methodological Design & Empirical Framework",
        brief: `Systematic selection criteria, measurement protocols, and quantitative evaluation indices for ${cleanTitle}.`,
        keyPoints: ["Sampling protocols and dataset verification", "Key performance metrics and quantitative tracking formulas", "Boundary conditions and error tolerances"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_3_1", title: "3.1 Sampling Protocols & Data Selection", brief: `Inclusion criteria, dataset curation, and verification protocols.` },
          { id: "sec_3_2", title: "3.2 Quantitative Metrics & Performance Indicators", brief: `Mathematical formulation of core tracking metrics and KPIs.` },
          { id: "sec_3_3", title: "3.3 Verification Safeguards & Validity Constraints", brief: `Controls for internal and external validity.` }
        ]
      },
      {
        id: "sec_4",
        title: "4. System Architecture & Technical Infrastructure",
        brief: `Technical infrastructure, systems integration, protocol standards, and data pipelines supporting ${cleanTitle}.`,
        keyPoints: ["System architecture and protocol design", "Infrastructure scalability, resilience, and uptime parameters", "Data pipelines and latency optimization"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_4_1", title: "4.1 High-Level Architectural Topology", brief: `System topology, component modularity, and operational workflow design.` },
          { id: "sec_4_2", title: "4.2 Data Pipelines & Protocol Standards", brief: `Data ingestion, processing pipeline, and protocol harmonization.` },
          { id: "sec_4_3", title: "4.3 Security & Fault-Tolerance Mechanisms", brief: `Redundancy safeguards, cryptographic integrity, and disaster recovery.` }
        ]
      },
      {
        id: "sec_5",
        title: "5. Empirical Findings & Granular Benchmark Synthesis",
        brief: `Deep data synthesis with structured comparison tables, verified institutional statistics, and performance distributions for ${cleanTitle}.`,
        keyPoints: ["Granular statistical distributions and verified data tables", "Demographic and sector performance benchmarks", "Comparative unit economics and operational metrics"],
        relevantSourceIndices: srcCount >= 2 ? [1, 3] : [1],
        subsections: [
          { id: "sec_5_1", title: "5.1 Quantitative Performance Distributions", brief: `Empirical distributions and performance benchmark metrics across testbeds.` },
          { id: "sec_5_2", title: "5.2 Comparative Benchmark Tables", brief: `Granular comparison tables evaluating multi-variable yield against existing standards.` },
          { id: "sec_5_3", title: "5.3 Statistical Significance & Sensitivity Analysis", brief: `Hypothesis validation, p-values, and parameter sensitivity testing.` }
        ]
      },
      {
        id: "sec_6",
        title: "6. Institutional Case Studies & Field Implementations",
        brief: `Exhaustive real-world case evaluations demonstrating concrete implementations and institutional outcomes.`,
        keyPoints: ["High-impact enterprise case study", "Public sector/academic deployment analysis", "Failures, post-mortems, and key lessons"],
        relevantSourceIndices: srcCount >= 3 ? [2, 4] : [1],
        subsections: [
          { id: "sec_6_1", title: "6.1 Enterprise-Scale Implementation Case", brief: `In-depth case review of commercial enterprise deployment and ROI metrics.` },
          { id: "sec_6_2", title: "6.2 Public Sector & Academic Deployment Analysis", brief: `Institutional case review of governance and open ecosystem deployment.` },
          { id: "sec_6_3", title: "6.3 Implementation Pitfalls & Post-Mortem Lessons", brief: `Analysis of observed implementation bottlenecks and key corrective measures.` }
        ]
      },
      {
        id: "sec_7",
        title: "7. Strategic Roadmap, Risk Governance & Economic Feasibility",
        brief: `Actionable phased implementation timeline, capital deployment sequencing, risk mitigation matrix, and governance checkpoints for ${cleanTitle}.`,
        keyPoints: ["Phased rollout milestones (Phase I, II, III)", "Comprehensive risk governance matrix", "Cost structures, unit economics, and return on investment"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1, 2],
        subsections: [
          { id: "sec_7_1", title: "7.1 Phased Execution Timeline & Milestones", brief: `Sequential implementation phases across near-term, mid-term, and long-term horizons.` },
          { id: "sec_7_2", title: "7.2 Comprehensive Risk Governance Matrix", brief: `Systematic risk scoring, mitigation protocols, and compliance checkpoints.` },
          { id: "sec_7_3", title: "7.3 Economic Feasibility & Capital Allocation Modeling", brief: `Unit economics, operational expenditure, and long-term commercial sustainability.` }
        ]
      }
    ];
  }

  return {
    title: capitalizedTitle,
    subtitle,
    docType,
    format: (options.format as any) || "docx",
    targetLength: lengthSpec.label,
    chapters: sections,
    sections
  };
}

export async function generateStructuredOutline(
  prompt: string,
  options: GenerateOutlineOptions = {},
  researchBundle?: ResearchBundle
): Promise<GeneratedOutline> {
  const geminiApiKey = options.customGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const docType = options.docType || "Research Report";
  const docBudget = calculateDocumentBudget(prompt, options);

  const docTypePromptInstructions: Record<string, string> = {
    "IEEE Research Paper": "Structure according to authentic IEEE Conference/Journal standard: Abstract & Keywords, I. INTRODUCTION, II. RELATED WORK & FOUNDATIONAL LITERATURE, III. PROPOSED SYSTEM METHODOLOGY & ARCHITECTURE, IV. EXPERIMENTAL SETUP & EMPIRICAL RESULTS, V. DISCUSSION, ABLATION ANALYSIS & THREATS TO VALIDITY, VI. CONCLUSION & FUTURE WORK, and REFERENCES.",
    "Research Paper": "Structure according to authentic IEEE Conference/Journal standard: Abstract & Keywords, I. INTRODUCTION, II. RELATED WORK & FOUNDATIONAL LITERATURE, III. PROPOSED SYSTEM METHODOLOGY & ARCHITECTURE, IV. EXPERIMENTAL SETUP & EMPIRICAL RESULTS, V. DISCUSSION, ABLATION ANALYSIS & THREATS TO VALIDITY, VI. CONCLUSION & FUTURE WORK, and REFERENCES.",
    "Research Report": `Structure as a rigorous multi-chapter Academic Project Report with exactly ${docBudget.chapterCount} chapters, each with ${docBudget.subsectionsPerChapterMin} to ${docBudget.subsectionsPerChapterMax} subsections (e.g., 1.1, 1.2, 1.3). Total target output: ~${docBudget.pageCount} printed pages (~${docBudget.totalTargetWords.toLocaleString()} words).`,
    "Academic Essay": "Structure as a formal Academic Essay: Introduction & Thesis Statement, Theoretical Foundations & Counter-arguments, Critical Textual Synthesis, and Scholarly Conclusion.",
    "Literature Review": "Structure as a formal Literature Review: Methodological Scope & Taxonomy, Synthesis of Contemporary Scholarship, Empirical Gaps & Divergences, and Future Research Agenda.",
    "Freeform Summary": "Structure as a concise Executive Summary: Core Takeaways, Structural Analysis of Themes, and Actionable Next Steps."
  };

  const systemPrompt = `You are Paperrrrrr's Lead Academic Document Architect. Output ONLY valid JSON matching this exact nested schema:
{
  "title": "Document Title",
  "subtitle": "Comprehensive Academic & Empirical Project Report",
  "docType": "${docType}",
  "format": "${options.format || "docx"}",
  "targetLength": "${docBudget.label}",
  "sections": [
    {
      "id": "sec_1",
      "title": "1. Introduction & Foundational Scope",
      "brief": "One sentence summary of this chapter",
      "keyPoints": ["Key point 1", "Key point 2"],
      "relevantSourceIndices": [1, 2],
      "subsections": [
        {
          "id": "sec_1_1",
          "title": "1.1 Background and Motivation",
          "brief": "One sentence brief for this subsection",
          "keyPoints": ["Point 1", "Point 2"]
        },
        {
          "id": "sec_1_2",
          "title": "1.2 Problem Formulation",
          "brief": "One sentence brief for this subsection",
          "keyPoints": ["Point 1", "Point 2"]
        }
      ]
    }
  ]
}`;

  const userMessage = `Create an authoritative, nested multi-chapter document outline for the following prompt:
"${prompt}"

Document Type: ${docType} (${docTypePromptInstructions[docType] || docTypePromptInstructions["Research Report"]})
Target Format: ${options.format || "docx"}
Target Tone: ${options.tone || "Academic Paper"}
Target Audience: ${options.audience || "Researchers & Practitioners"}
Target Length: ${docBudget.label} (Explicit target: ~${docBudget.pageCount} printed pages, ~${docBudget.totalTargetWords.toLocaleString()} words across ${docBudget.chapterCount} chapters)

${options.referenceNotes ? `User Provided Background / Reference Notes:\n${options.referenceNotes}\n` : ""}
${options.additionalRequirements ? `User Additional Custom Requirements:\n${options.additionalRequirements}\n` : ""}

Live Research Sources Available:
${JSON.stringify(researchBundle?.results || [], null, 2)}

Strict Structural Requirements:
1. CHAPTER COUNT: Generate exactly ${docBudget.chapterCount} top-level chapters (e.g. Chapter 1 through Chapter ${docBudget.chapterCount}), numbered with standard decimal prefix like "1. Introduction", "2. Historical Genesis", etc. Scale the chapter count specifically to meet the ${docBudget.pageCount}-page publication requirement.
2. NESTED SUBSECTIONS: Each top-level chapter MUST contain an array of ${docBudget.subsectionsPerChapterMin} to ${docBudget.subsectionsPerChapterMax} subsections with proper decimal numbering (e.g., "1.1 Background and Motivation", "1.2 Problem Statement", "1.3 Research Objectives").
3. Each subsection must have its own descriptive title and 1-sentence brief.
4. Link relevant research source indices to each chapter.`;

  // 1. Primary AI Provider: Google Gemini (@google/genai)
  if (geminiApiKey) {
    const requestedModel = options.geminiModel || "gemini-3.6-flash";
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      let response;
      try {
        response = await ai.models.generateContent({
          model: requestedModel,
          contents: `${systemPrompt}\n\n${userMessage}`,
          config: {
            responseMimeType: "application/json"
          }
        });
      } catch (modelErr) {
        console.warn(`Gemini model "${requestedModel}" failed, falling back to gemini-2.5-flash:`, modelErr);
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `${systemPrompt}\n\n${userMessage}`,
          config: {
            responseMimeType: "application/json"
          }
        });
      }

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.sections && Array.isArray(parsed.sections)) {
          return parsed as GeneratedOutline;
        }
      }
    } catch (e) {
      console.warn("Gemini API call failed for outline, checking secondary provider:", e);
    }
  }

  // 2. Secondary AI Provider: OpenAI (gpt-4o-mini)
  const openaiApiKey = options.customOpenAIKey || process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      if (parsed.sections && Array.isArray(parsed.sections)) {
        return parsed as GeneratedOutline;
      }
    } catch (e) {
      console.warn("OpenAI API call failed for outline, using dynamic generator:", e);
    }
  }

  // 3. Dynamic outline generator
  return buildDynamicOutline(prompt, options, researchBundle);
}

export async function generateSectionProse(
  docTitle: string,
  section: OutlineSection,
  filteredSources: ResearchSnippet[],
  customKeys?: {
    customGeminiKey?: string;
    customOpenAIKey?: string;
    geminiModel?: string;
    referenceNotes?: string;
    docType?: string;
    tone?: string;
    format?: string;
    targetLength?: string;
    targetChapterWords?: number;
    targetSubsectionWords?: number;
    additionalRequirements?: string;
  }
): Promise<string> {
  const geminiApiKey = customKeys?.customGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const tone = customKeys?.tone || "Academic & Analytical";
  const docType = customKeys?.docType || "Research Report";
  const format = customKeys?.format || "docx";
  const targetLength = customKeys?.targetLength || "Unlimited & Exhaustive (Comprehensive In-Depth, 30–50 Pages)";
  const isPptx = format === "pptx";
  const isExhaustive = (format === "docx" || format === "pdf") && (targetLength.toLowerCase().includes("unlimited") || targetLength.toLowerCase().includes("detailed") || (customKeys?.targetChapterWords || 0) >= 600);

  const targetWords = customKeys?.targetChapterWords || 750;
  const subCount = section.subsections && section.subsections.length > 0 ? section.subsections.length : 3;
  const targetSubWords = customKeys?.targetSubsectionWords || Math.round(targetWords / subCount);

  const isIEEE = docType === "Research Paper" || docType === "IEEE Research Paper" || docType === "Conference Paper" || docTitle.toLowerCase().includes("ieee");

  let formatInstruction = "";
  if (isPptx) {
    formatInstruction = `- POWERPOINT PRESENTATION SLIDE FORMAT:
Write high-impact, professional executive presentation content for this specific slide.
Format the output as follows:
### Slide Focus: ${section.title}
* **Core Takeaway:** Concise, punchy bullet point summarizing the primary assertion.
* **Key Empirical Metric:** Specific quantitative datum, benchmark, or market statistic with citation [Source: Organization](URL).
* **Strategic Capability:** Operational impact, architectural mechanism, or capability.
* **Execution Milestone:** Actionable timeline deliverable or strategic priority.

> 💡 **KEY METRIC:** [Highlight statistic, e.g. $48.5B Market Opportunity by 2028 (+32.4% CAGR)]

> 🎙️ **PRESENTER NOTES:** [2-3 sentences of articulate executive talking points and speaking guidance for the presenter].`;
  } else if (isIEEE) {
    formatInstruction = `- IEEE 2-COLUMN RESEARCH PAPER STANDARD:
Write rigorous, publication-grade academic prose adhering to IEEE conference/journal standards:
1. FORMAL STRUCTURE: Dense, authoritative, mathematically grounded prose with active voice and precise engineering terminology.
2. SUBSECTIONS: If writing subsections, format with capital letters (e.g. \`### A. Motivation and Domain Urgency\`, \`### B. System Architecture\`) and sub-subsections as \`#### 1) Algorithmic Pipeline:\`.
3. MATHEMATICAL EQUATIONS: Provide formal mathematical models and equations centered with right-aligned numbering, e.g.:
   $$E_{total} = \\sum_{i=1}^{N} \\alpha_i \\cdot x_i + \\beta \\quad (1)$$
4. EMPIRICAL TABLES: Where appropriate, include markdown comparison tables formatted with IEEE table captions above the table (e.g., \`TABLE I. EMPIRICAL BENCHMARK EVALUATION\`).
5. AUTHENTIC CITATIONS: Use strict IEEE in-text bracketed citations like [1], [2], [1]-[3] citing the research snippets provided below.
6. TARGET DEPTH: Write 3-5 comprehensive paragraphs with verified empirical statistics.`;
  } else if (section.subsections && section.subsections.length > 0) {
    formatInstruction = `- NESTED SUBSECTIONS & WORD BUDGET REQUIREMENT:
Target Word Count for this entire chapter: approximately ${targetWords} words (~${targetSubWords} words per subsection).
This chapter contains ${section.subsections.length} specific subsections. You MUST write dedicated, detailed academic prose for EACH subsection in order:
${section.subsections.map(sub => `### ${sub.title}\nBrief: ${sub.brief}${sub.keyPoints ? `\nKey Points: ${sub.keyPoints.join(", ")}` : ""}`).join("\n\n")}

For EACH subsection, output the markdown subheading (e.g. \`### ${section.subsections[0]?.title || '1.1 Title'}\`) followed by 3 to 5 rich, justified paragraphs (~${targetSubWords} words) addressing that subsection's brief directly. Include structured tables or mathematical equations where appropriate.`;
  } else if (isExhaustive) {
    formatInstruction = `- UNLIMITED & EXHAUSTIVE PUBLICATION DEPTH: Write exhaustive, multi-subsection prose (Target: ~${targetWords} words for this chapter).
- Divide the chapter into formal analytical subsections using:
  ### ${section.title.replace(/^\d+\.\s*/, "").split(" ")[0]} - Subsection 1: Foundational Framework
  ### ${section.title.replace(/^\d+\.\s*/, "").split(" ")[0]} - Subsection 2: Empirical Data & Synthesis
  ### ${section.title.replace(/^\d+\.\s*/, "").split(" ")[0]} - Subsection 3: Case Evidence & Directives
- Include structured Markdown Data Tables to present empirical distributions cleanly.`;
  } else {
    formatInstruction = `- Write 3-5 comprehensive, articulate paragraphs with structured points (Target: ~${targetWords} words).`;
  }

  const prompt = `Write publication-grade, rigorous prose for the following section:
Document Title: ${docTitle}
Document Type: ${docType}
Target Format: ${format}
Target Length: ${targetLength}
Tone: ${tone}
Section Title: ${section.title}
Section Brief: ${section.brief}
Key Points: ${section.keyPoints.join("; ")}
Word Budget Target: ~${targetWords} words total (~${targetSubWords} words per subsection)

${customKeys?.referenceNotes ? `User Reference Notes:\n${customKeys.referenceNotes}\n` : ""}
${customKeys?.additionalRequirements ? `User Additional Requirements:\n${customKeys.additionalRequirements}\n` : ""}

Filtered Research Snippets for this section ONLY:
${JSON.stringify(filteredSources, null, 2)}

STRICT EMPIRICAL GROUNDING & ANTI-AI-SMELL (HALLMARK) INSTRUCTIONS:
1. ZERO FABRICATED NUMBERS: Every single quantitative statistic, percentage, dollar figure, and performance metric MUST come directly and verifiably from the provided Research Snippets above.
2. If the retrieved Research Snippets DO NOT contain a specific quantitative metric for a given subtopic, discuss that topic conceptually, theoretically, and architecturally using qualitative domain analysis. DO NOT fabricate, guess, or invent plausible-sounding numbers or percentage improvements.
3. AUTHENTIC CITATIONS: Every markdown citation like [Source: Organization](URL) MUST reference a real URL from the provided Research Snippets. Never invent fake URLs or cite unrelated sources.
4. NO TEMPLATED REPETITION: Every subsection must feature distinct arguments, operational mechanics, and synthesis. Do NOT repeat paragraph structures or copy-paste identical sentences.
5. COMPLETE DE-AI / HUMANIZED SYNTAX (Zero AI Tell-Signs):
   - PROHIBITED AI TELL-WORDS: Strictly NEVER use "delve", "tapestry", "beacon", "testament", "elevate", "cutting-edge", "game-changer", "seamless", "realm", "crucial", "harness", "leverage", "moreover", "furthermore", "in conclusion", "it is worth noting", "in this fast-paced world", "it goes without saying", "serves as a reminder", "intertwined".
   - NO RULE-OF-THREE EPIDEMIC: Do not force symmetrical 3-item lists or triplet adjectives. Write natural, asymmetrical sentences.
   - NO AI SANDWICH FORMULAS: Avoid generic introductions ("In today's landscape...") and redundant wrap-ups ("Overall, it is important to..."). Dive straight into the technical substance.
   - BURSTINESS & RHYTHMIC VARIATION: Mix short, punchy declarative statements with detailed analytical explanations. Use active verbs and precise engineering/scholarly terminology.
${formatInstruction}
- Output ONLY the section body markdown.`;

  // 1. Primary AI Provider: Google Gemini (@google/genai)
  if (geminiApiKey) {
    const requestedModel = customKeys?.geminiModel || "gemini-3.6-flash";
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      let response;
      try {
        response = await ai.models.generateContent({
          model: requestedModel,
          contents: prompt
        });
      } catch (modelErr) {
        console.warn(`Gemini model "${requestedModel}" failed for section, falling back to gemini-2.5-flash:`, modelErr);
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });
      }

      if (response && response.text) {
        return response.text;
      }
    } catch (e) {
      console.warn("Gemini section generation failed, checking secondary provider:", e);
    }
  }

  // 2. Secondary AI Provider: OpenAI (gpt-4o-mini)
  const openaiApiKey = customKeys?.customOpenAIKey || process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      });

      return completion.choices[0].message.content || "";
    } catch (e) {
      console.warn("OpenAI section generation failed, using dynamic research synthesizer:", e);
    }
  }

  // 3. Dynamic Section Prose Synthesizer strictly referencing the filtered research and brief
  if (filteredSources.length === 0 && !section.brief) {
    return "[Section could not be generated due to insufficient source context. Please retry with additional search queries.]";
  }

  const citations = filteredSources
    .map((s) => `[Source: ${s.title}](${s.url})`)
    .join(", ");

  let prefix = `Section **${section.title}** addresses ${section.brief.toLowerCase()}`;
  if (docType === "Academic Essay") {
    prefix = `In evaluating **${section.title}**, the central argument focuses on ${section.brief.toLowerCase()}`;
  } else if (docType === "Literature Review") {
    prefix = `Scholarship regarding **${section.title}** highlights key dynamics in ${section.brief.toLowerCase()}`;
  } else if (docType === "Freeform Summary") {
    prefix = `**Core Finding for ${section.title}:** ${section.brief}`;
  }

  if (section.subsections && section.subsections.length > 0) {
    const secHash = section.title.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

    return section.subsections.map((sub, sIdx) => {
      const sourceIdx = (secHash + sIdx) % Math.max(1, filteredSources.length);
      const matchedSource = filteredSources[sourceIdx];
      const sourceCitation = matchedSource ? `[Source: ${matchedSource.title}](${matchedSource.url})` : "";
      const sourceSnippet = matchedSource?.snippet || "";
      const cleanSub = sub.title.replace(/^\d+(\.\d+)*\s*/, "").trim();
      const variant = (secHash + sIdx * 7) % 5;

      let p1 = "";
      let p2 = "";
      let p3 = "";

      if (variant === 0) {
        p1 = `### ${sub.title}\n\n` +
          `Understanding ${cleanSub.toLowerCase()} requires analyzing how ${sub.brief.toLowerCase()}. ` +
          (sourceSnippet ? `Recent empirical research confirms: "${sourceSnippet}" ${sourceCitation}. ` : "") +
          `By isolating the underlying parameters of ${cleanSub.toLowerCase()}, engineers and researchers establish practical operational benchmarks rather than relying on abstract assumptions.`;
        p2 = `At the implementation level, workflows in ${cleanSub.toLowerCase()} must balance component dependencies against latency overhead. ` +
          `Decoupled architectures reduce failure cascades and preserve state consistency across production nodes.`;
        p3 = `Effective deployment relies on automated instrumentation, continuous regression testing, and predictable telemetry signals aligned directly with core project goals.`;
      } else if (variant === 1) {
        p1 = `### ${sub.title}\n\n` +
          `Field data from ${cleanSub.toLowerCase()} demonstrates clear constraints regarding ${sub.brief.toLowerCase()}. ` +
          (sourceSnippet ? `Published findings report that "${sourceSnippet}" ${sourceCitation}. ` : "") +
          `These baseline measurements give engineering teams actionable targets for throughput, error tolerance, and resource allocation.`;
        p2 = `Operational environments handling ${cleanSub.toLowerCase()} demand strict integrity checks and isolated error boundaries. ` +
          `Deterministic routing and bounded concurrency prevent tail-latency spikes during peak utilization windows.`;
        p3 = `Teams that formalize these operational limits early avoid recurring technical debt and maintain stable execution cycles.`;
      } else if (variant === 2) {
        p1 = `### ${sub.title}\n\n` +
          `Governance and architectural constraints in ${cleanSub.toLowerCase()} directly shape how ${sub.brief.toLowerCase()}. ` +
          (sourceSnippet ? `Institutional reports show that "${sourceSnippet}" ${sourceCitation}. ` : "") +
          `Aligning system design with strict compliance parameters keeps audit trails verifiable and runtime configurations reproducible.`;
        p2 = `Enforcing access boundaries in ${cleanSub.toLowerCase()} requires explicit permission scopes and structured audit logs. ` +
          `These controls eliminate configuration drift while maintaining predictable service behavior across distributed clusters.`;
        p3 = `Automating validation checks during build and deployment phases ensures that security requirements remain active across every release.`;
      } else if (variant === 3) {
        p1 = `### ${sub.title}\n\n` +
          `Evaluating the infrastructure costs and lifecycle patterns of ${cleanSub.toLowerCase()} highlights real trade-offs in ${sub.brief.toLowerCase()}. ` +
          (sourceSnippet ? `Industry metrics document that "${sourceSnippet}" ${sourceCitation}. ` : "") +
          `Tracking resource consumption per compute unit enables precise budgeting across multi-quarter roadmaps.`;
        p2 = `Managing compute overhead in ${cleanSub.toLowerCase()} favors lightweight abstractions over heavy runtime dependencies. ` +
          `Standardized interfaces reduce integration friction and simplify maintenance over extended service lifetimes.`;
        p3 = `Disciplined resource monitoring and regular capacity reviews protect production systems from unexpected provisioning spikes.`;
      } else {
        p1 = `### ${sub.title}\n\n` +
          `A comparative evaluation of ${cleanSub.toLowerCase()} clarifies key operational requirements for ${sub.brief.toLowerCase()}. ` +
          (sourceSnippet ? `Empirical studies indicate that "${sourceSnippet}" ${sourceCitation}. ` : "") +
          `Standardizing component definitions ensures clear communication across development teams and prevents integration mismatches.`;
        p2 = `Deploying ${cleanSub.toLowerCase()} requires comprehensive test suites, clear interface contracts, and real-time observability. ` +
          `These practices provide immediate feedback during degradation events, enabling fast root-cause identification.`;
        p3 = `Continued refinement of ${cleanSub.toLowerCase()} depends on shared benchmarks and rigorous peer review across engineering groups.`;
      }

      return `${p1}\n\n${p2}\n\n${p3}`;
    }).join("\n\n---\n\n");
  }

  const primarySource = filteredSources[0];
  const primaryFact = primarySource?.snippet ? `Verified research confirms that "${primarySource.snippet}" [Source: ${primarySource.title}](${primarySource.url}). ` : "";

  return `${prefix}\n\n` +
    primaryFact +
    `Production implementations indicate that disciplined interface boundaries and regular telemetry validation prevent operational bottlenecks while enforcing system reliability.\n\n` +
    `Ongoing evaluation frameworks ensure that architectural standards adapt smoothly as project requirements expand.`;
}

/**
 * Research-grounded expansion pass for sections that came in under their word budget target
 */
export async function expandSectionProse(
  docTitle: string,
  section: OutlineSection,
  currentProse: string,
  targetWords: number,
  groundingSources: ResearchSnippet[] = [],
  customKeys?: {
    customGeminiKey?: string;
    customOpenAIKey?: string;
    geminiModel?: string;
    tone?: string;
  }
): Promise<string> {
  const geminiApiKey = customKeys?.customGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const currentWords = currentProse.split(/\s+/).filter(Boolean).length;
  const missingWords = Math.max(200, targetWords - currentWords);

  const expansionPrompt = `You are Paperrrrrr's Senior Research Editor. Expand and deepen the following section for the document "${docTitle}" using the newly retrieved grounded research snippets.

Section Title: ${section.title}
Section Brief: ${section.brief}
Current Word Count: ${currentWords} words
Target Word Count: ~${targetWords} words (~${missingWords} additional words needed)

Newly Retrieved Grounded Research Snippets:
${JSON.stringify(groundingSources, null, 2)}

Current Drafted Prose:
${currentProse}

STRICT EMPIRICAL GROUNDING & ZERO-HALLUCINATION RULES:
1. Every statistic, percentage, dollar figure, and quantitative benchmark in your expansion MUST be directly quoted or traceable to the Newly Retrieved Grounded Research Snippets above. DO NOT invent imaginary performance metrics or statistical significance values.
2. If the research snippets lack numerical metrics for a specific subtopic, provide deep qualitative and architectural analysis (e.g. theoretical foundations, component trade-offs, engineering paradigms, governance considerations) instead of guessing numbers.
3. Every citation MUST use the real URLs provided in the research snippets: [Source: Title](URL).
4. Substantially enrich each subsection with deep domain precision.
5. Avoid repetition, templated phrases, or boilerplate clichés.
6. Return the COMPLETE, expanded section markdown.`;

  if (geminiApiKey) {
    const requestedModel = customKeys?.geminiModel || "gemini-3.6-flash";
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      let response;
      try {
        response = await ai.models.generateContent({
          model: requestedModel,
          contents: expansionPrompt
        });
      } catch {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: expansionPrompt
        });
      }
      if (response && response.text) {
        return response.text;
      }
    } catch (e) {
      console.warn("Gemini grounded expansion failed:", e);
    }
  }

  const openaiApiKey = customKeys?.customOpenAIKey || process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: expansionPrompt }]
      });
      return completion.choices[0].message.content || currentProse;
    } catch (e) {
      console.warn("OpenAI grounded expansion failed:", e);
    }
  }

  // Qualitative Grounded Fallback Expansion
  const sourceFacts = groundingSources
    .slice(0, 3)
    .map(s => `Documented research confirms: "${s.snippet}" [Source: ${s.title}](${s.url}).`)
    .join("\n\n");

  const expansionAddition = `\n\n### ${section.title} - Extended Theoretical & Empirical Evaluation\n\n` +
    (sourceFacts ? `${sourceFacts}\n\n` : "") +
    `A deeper inquiry into ${section.title.toLowerCase()} reveals nuanced trade-offs between architectural agility and operational determinism. ` +
    `Practitioners must address cross-functional coordination challenges, data lifecycle policies, and ongoing validation protocols. ` +
    `By implementing continuous monitoring and verifiable audit logging, organizations ensure sustained resilience and governance fidelity across multi-phase deployment cycles.`;

  return `${currentProse}${expansionAddition}`;
}

/**
 * Deduplication filter to prevent duplicate or near-duplicate paragraphs across the document
 */
export function isNearDuplicateParagraph(para1: string, para2: string): boolean {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const words1 = new Set(clean(para1).split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(clean(para2).split(/\s+/).filter(w => w.length > 3));

  if (words1.size === 0 || words2.size === 0) return false;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }

  const union = words1.size + words2.size - intersection;
  if (union === 0) return false;

  const jaccardSimilarity = intersection / union;
  return jaccardSimilarity > 0.75;
}

export function filterDuplicateParagraphs(
  sections: Array<{ id: string; title: string; brief: string; content: string; subsections?: any[] }>
): Array<{ id: string; title: string; brief: string; content: string; subsections?: any[] }> {
  const seenParagraphs: string[] = [];

  return sections.map(sec => {
    const rawParagraphs = sec.content.split("\n\n");
    const uniqueParagraphs: string[] = [];

    for (const para of rawParagraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // Keep headings, tables, and short lines intact
      if (trimmed.startsWith("#") || trimmed.startsWith("|") || trimmed.length < 80) {
        uniqueParagraphs.push(trimmed);
        continue;
      }

      const isDuplicate = seenParagraphs.some(seen => isNearDuplicateParagraph(seen, trimmed));
      if (!isDuplicate) {
        seenParagraphs.push(trimmed);
        uniqueParagraphs.push(trimmed);
      }
    }

    return {
      ...sec,
      content: uniqueParagraphs.join("\n\n")
    };
  });
}

/**
 * Regenerates an individual section with custom user instructions
 */
export async function regenerateSingleSection(
  docTitle: string,
  section: OutlineSection,
  filteredSources: ResearchSnippet[],
  userInstruction: string,
  customKeys?: { customGeminiKey?: string; customOpenAIKey?: string; geminiModel?: string; docType?: string; tone?: string }
): Promise<string> {
  const geminiApiKey = customKeys?.customGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const prompt = `You are revising an individual section of a research document:
Document Title: ${docTitle}
Section Title: ${section.title}
Current Brief: ${section.brief}
Key Points: ${section.keyPoints.join("; ")}
Specific Revision Instruction from User: "${userInstruction || "Deepen analytical depth with specific quantitative metrics."}"

Filtered Research Sources:
${JSON.stringify(filteredSources, null, 2)}

Instructions:
- Rewrite the section prose following the revision instruction.
- Include proper markdown citations like [Source: Title](URL).
- Return ONLY the revised markdown prose.`;

  if (geminiApiKey) {
    const requestedModel = customKeys?.geminiModel || "gemini-3.6-flash";
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      let response;
      try {
        response = await ai.models.generateContent({
          model: requestedModel,
          contents: prompt
        });
      } catch (modelErr) {
        console.warn(`Gemini model "${requestedModel}" failed for regeneration, falling back to gemini-2.5-flash:`, modelErr);
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });
      }
      if (response && response.text) return response.text;
    } catch (e) {
      console.warn("Gemini section regeneration failed:", e);
    }
  }

  const openaiApiKey = customKeys?.customOpenAIKey || process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      });
      return completion.choices[0].message.content || "";
    } catch (e) {
      console.warn("OpenAI section regeneration failed:", e);
    }
  }

  return generateSectionProse(docTitle, section, filteredSources, customKeys);
}
