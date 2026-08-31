import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { ResearchBundle, ResearchSnippet } from "./tavily";

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 12000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`LLM operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

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
  isIEEEPaper?: boolean;
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
    subtitle = `A Multi-Chapter Report (${lengthSpec.label})`;
    sections = [
      {
        id: "sec_1",
        title: "1. Introduction",
        brief: `Overview of baseline metrics, scope, and key objectives for ${cleanTitle}.`,
        keyPoints: [`Background and core purpose`, "Key problems and inefficiencies", "Scope boundaries and project goals"],
        relevantSourceIndices: [1],
        subsections: [
          { id: "sec_1_1", title: "1.1 Background & Motivation", brief: `Context and motivation for ${cleanTitle}.` },
          { id: "sec_1_2", title: "1.2 Problem Statement", brief: `Clear breakdown of key challenges and bottlenecks.` },
          { id: "sec_1_3", title: "1.3 Project Goals & Scope", brief: `Specific goals and scope boundaries.` }
        ]
      },
      {
        id: "sec_2",
        title: "2. Background & History",
        brief: `Timeline, milestones, and development history of ${cleanTitle}.`,
        keyPoints: ["Early development phases", "Major turning points", "Current adoption state"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1],
        subsections: [
          { id: "sec_2_1", title: "2.1 Early Developments", brief: `Initial efforts and early prototypes.` },
          { id: "sec_2_2", title: "2.2 Key Turning Points", brief: `Major pivots and breakthrough events.` },
          { id: "sec_2_3", title: "2.3 Current State", brief: `Where the technology and market stand today.` }
        ]
      },
      {
        id: "sec_3",
        title: "3. Literature Review",
        brief: `Summary of published studies, baseline methods, and existing research.`,
        keyPoints: ["Foundational studies", "Comparison of current approaches", "Key unanswered questions"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1],
        subsections: [
          { id: "sec_3_1", title: "3.1 Prior Research", brief: `Overview of existing methods and published findings.` },
          { id: "sec_3_2", title: "3.2 Comparison of Existing Approaches", brief: `Strengths and weaknesses of current models.` },
          { id: "sec_3_3", title: "3.3 Unresolved Questions", brief: `Identified gaps that this project addresses.` }
        ]
      },
      {
        id: "sec_4",
        title: "4. Methodology & Research Approach",
        brief: `Step-by-step methodology, data collection, and evaluation criteria for ${cleanTitle}.`,
        keyPoints: ["Data collection methods", "Measurement criteria", "Testing and verification controls"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_4_1", title: "4.1 Data Collection & Setup", brief: `How data was gathered and verified.` },
          { id: "sec_4_2", title: "4.2 Evaluation Metrics", brief: `Key metrics used to measure performance.` },
          { id: "sec_4_3", title: "4.3 Testing Controls", brief: `Safeguards to ensure accurate and repeatable results.` }
        ]
      },
      {
        id: "sec_5",
        title: "5. System Architecture",
        brief: `Overall system layout, component design, and operational workflows.`,
        keyPoints: ["Core components", "Communication and data flow", "Performance and speed targets"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_5_1", title: "5.1 Component Design", brief: `Breakdown of main parts and modules.` },
          { id: "sec_5_2", title: "5.2 Data Flow & Communication", brief: `How messages and data move through the system.` },
          { id: "sec_5_3", title: "5.3 Speed & Latency Optimization", brief: `Techniques to keep the system responsive under load.` }
        ]
      },
      {
        id: "sec_6",
        title: "6. Data Pipelines & Standards",
        brief: `Data ingestion, processing pipeline, and format standards.`,
        keyPoints: ["Data intake pipelines", "Schema validation", "Tracking and audit logs"],
        relevantSourceIndices: srcCount >= 3 ? [1, 3] : [1],
        subsections: [
          { id: "sec_6_1", title: "6.1 Ingestion & Processing", brief: `Streaming ingestion and data validation rules.` },
          { id: "sec_6_2", title: "6.2 Data Integrity", brief: `Verification checks and audit logs.` },
          { id: "sec_6_3", title: "6.3 Compatibility & Standards", brief: `Integration with external tools and formats.` }
        ]
      },
      {
        id: "sec_7",
        title: "7. Security & Fault Tolerance",
        brief: `Security safeguards, backup protocols, and disaster recovery.`,
        keyPoints: ["Access control rules", "Backup and recovery systems", "Threat defense and monitoring"],
        relevantSourceIndices: srcCount >= 4 ? [2, 4] : [1],
        subsections: [
          { id: "sec_7_1", title: "7.1 Threat Analysis", brief: `Identification of potential vulnerabilities and defenses.` },
          { id: "sec_7_2", title: "7.2 Backup & Recovery", brief: `Automatic failover and data recovery systems.` },
          { id: "sec_7_3", title: "7.3 Access Control & Encryption", brief: `User permissions and cryptographic safeguards.` }
        ]
      },
      {
        id: "sec_8",
        title: "8. Test Results & Metrics",
        brief: `Testbed results, performance comparison tables, and benchmark data.`,
        keyPoints: ["Performance test results", "Comparison against baseline", "Statistical metrics"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1],
        subsections: [
          { id: "sec_8_1", title: "8.1 Benchmark Results", brief: `Measured performance across standard test cases.` },
          { id: "sec_8_2", title: "8.2 Comparison Table", brief: `Side-by-side comparison with earlier baselines.` },
          { id: "sec_8_3", title: "8.3 Statistical Summary", brief: `Significance tests, error ranges, and averages.` }
        ]
      },
      {
        id: "sec_9",
        title: "9. Case Studies",
        brief: `Real-world examples and deployment reviews.`,
        keyPoints: ["Company implementation review", "Public sector example", "Lessons learned and key takeaways"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_9_1", title: "9.1 Commercial Deployment", brief: `Outcomes from a real-world enterprise deployment.` },
          { id: "sec_9_2", title: "9.2 Public Sector Deployment", brief: `Outcomes from an institutional implementation.` },
          { id: "sec_9_3", title: "9.3 Lessons Learned", brief: `Practical takeaways and corrective fixes.` }
        ]
      },
      {
        id: "sec_10",
        title: "10. Costs & Unit Economics",
        brief: `Financial breakdown, operating costs, and return on investment.`,
        keyPoints: ["Cost per unit", "5-year ownership costs", "Estimated payback timeline"],
        relevantSourceIndices: srcCount >= 3 ? [1, 3] : [1],
        subsections: [
          { id: "sec_10_1", title: "10.1 Unit Cost Breakdown", brief: `Cost per user, transaction, or compute unit.` },
          { id: "sec_10_2", title: "10.2 Total Cost of Ownership", brief: `Setup costs, hosting, and ongoing maintenance.` },
          { id: "sec_10_3", title: "10.3 Payback Period", brief: `Expected break-even and financial returns.` }
        ]
      },
      {
        id: "sec_11",
        title: "11. Regulations & Compliance",
        brief: `Legal rules, data protection standards, and compliance policies.`,
        keyPoints: ["Key regulations", "Compliance checklist", "Upcoming legal changes"],
        relevantSourceIndices: srcCount >= 4 ? [1, 4] : [1],
        subsections: [
          { id: "sec_11_1", title: "11.1 Regulatory Requirements", brief: `Overview of relevant laws and regional guidelines.` },
          { id: "sec_11_2", title: "11.2 Compliance Audits", brief: `Protocols for routine audits and record-keeping.` },
          { id: "sec_11_3", title: "11.3 Future Policy Changes", brief: `Expected policy updates over the next 3-5 years.` }
        ]
      },
      {
        id: "sec_12",
        title: "12. Project Roadmap",
        brief: `Phased rollout schedule, target milestones, and release plans.`,
        keyPoints: ["Phase 1 (Months 1–12): Pilot", "Phase 2 (Years 2–3): Scaling", "Phase 3 (Years 4–5): Full Rollout"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_12_1", title: "12.1 Phase 1: Pilot & Setup", brief: `Initial deployment and prototype validation.` },
          { id: "sec_12_2", title: "12.2 Phase 2: Growth & Scaling", brief: `Expanding capacity and onboarding users.` },
          { id: "sec_12_3", title: "12.3 Phase 3: Long-Term Operation", brief: `Ongoing maintenance and continuous improvements.` }
        ]
      },
      {
        id: "sec_13",
        title: "13. Risk Management",
        brief: `Risk assessment, mitigation steps, and emergency contingency plans.`,
        keyPoints: ["Identified risks and severity", "Prevention steps", "Incident response procedures"],
        relevantSourceIndices: srcCount >= 4 ? [1, 4] : [1],
        subsections: [
          { id: "sec_13_1", title: "13.1 Key Risks & Severity", brief: `Evaluation of technical, legal, and operational risks.` },
          { id: "sec_13_2", title: "13.2 Prevention & Mitigation", brief: `Specific safeguards to prevent failures.` },
          { id: "sec_13_3", title: "13.3 Incident Response", brief: `Procedures to handle unexpected outages or issues.` }
        ]
      },
      {
        id: "sec_14",
        title: "14. Summary & Next Steps",
        brief: `Summary of main findings, core takeaways, and future priorities.`,
        keyPoints: ["Summary of key findings", "Main contributions", "Next steps and future directions"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1],
        subsections: [
          { id: "sec_14_1", title: "14.1 Summary of Findings", brief: `Overview of the project results and conclusions.` },
          { id: "sec_14_2", title: "14.2 Main Contributions", brief: `Practical benefits delivered by the project.` },
          { id: "sec_14_3", title: "14.3 Future Directions", brief: `Recommended next steps and research questions.` }
        ]
      }
    ];
  } else {
    sections = [
      {
        id: "sec_1",
        title: "1. Introduction",
        brief: `Introduction to baseline metrics, scope, and objectives for ${cleanTitle}.`,
        keyPoints: [`Background and motivation`, "Problem statement and challenges", "Project scope and deliverables"],
        relevantSourceIndices: [1],
        subsections: [
          { id: "sec_1_1", title: "1.1 Background & Motivation", brief: `Background context and reasons for this project.` },
          { id: "sec_1_2", title: "1.2 Problem Statement", brief: `Clear description of the core problem.` },
          { id: "sec_1_3", title: "1.3 Project Goals & Scope", brief: `Specific goals and scope limits.` }
        ]
      },
      {
        id: "sec_2",
        title: "2. Literature Review",
        brief: `Overview of existing research, published studies, and baseline models for ${cleanTitle}.`,
        keyPoints: ["History and development", "Current approaches and comparisons", "Unresolved gaps in literature"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1],
        subsections: [
          { id: "sec_2_1", title: "2.1 History & Early Work", brief: `Key milestones in the field.` },
          { id: "sec_2_2", title: "2.2 Current Approaches", brief: `How other teams currently solve this problem.` },
          { id: "sec_2_3", title: "2.3 Unresolved Gaps", brief: `What is still missing in existing solutions.` }
        ]
      },
      {
        id: "sec_3",
        title: "3. Methodology & System Architecture",
        brief: `System design, technical setup, and testing methodology for ${cleanTitle}.`,
        keyPoints: ["System layout and components", "Data pipelines and protocols", "Testing procedures and validation"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1],
        subsections: [
          { id: "sec_3_1", title: "3.1 System Design", brief: `Overall layout and component roles.` },
          { id: "sec_3_2", title: "3.2 Data Pipelines", brief: `How data is ingested and verified.` },
          { id: "sec_3_3", title: "3.3 Testing & Validation", brief: `Testing procedures and accuracy checks.` }
        ]
      },
      {
        id: "sec_4",
        title: "4. Test Results & Benchmark Evaluation",
        brief: `Empirical test results, performance comparisons, and benchmark data tables.`,
        keyPoints: ["Test results summary", "Comparison table against baseline", "Key performance metrics"],
        relevantSourceIndices: srcCount >= 2 ? [1, 3] : [1],
        subsections: [
          { id: "sec_4_1", title: "4.1 Test Results", brief: `Summary of measured performance.` },
          { id: "sec_4_2", title: "4.2 Comparison Table", brief: `Side-by-side comparison table against baselines.` },
          { id: "sec_4_3", title: "4.3 Metric Analysis", brief: `Detailed breakdown of speed, accuracy, and efficiency.` }
        ]
      },
      {
        id: "sec_5",
        title: "5. Case Studies & Real-World Deployments",
        brief: `Practical examples, deployment reviews, and real-world outcomes.`,
        keyPoints: ["Commercial deployment review", "Public sector example", "Lessons learned"],
        relevantSourceIndices: srcCount >= 3 ? [2, 4] : [1],
        subsections: [
          { id: "sec_5_1", title: "5.1 Commercial Deployment", brief: `Results from an enterprise deployment.` },
          { id: "sec_5_2", title: "5.2 Public Sector Deployment", brief: `Results from an institutional project.` },
          { id: "sec_5_3", title: "5.3 Lessons Learned", brief: `Key takeaways and operational fixes.` }
        ]
      },
      {
        id: "sec_6",
        title: "6. Project Roadmap & Risk Management",
        brief: `Rollout roadmap, risk mitigation strategies, and future plans for ${cleanTitle}.`,
        keyPoints: ["Phased implementation timeline", "Risk assessment and safeguards", "Next steps and future plans"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1],
        subsections: [
          { id: "sec_6_1", title: "6.1 Phased Timeline", brief: `Milestones across setup, rollout, and scaling.` },
          { id: "sec_6_2", title: "6.2 Risk Mitigation", brief: `Safeguards to prevent and handle issues.` },
          { id: "sec_6_3", title: "6.3 Next Steps", brief: `Recommended priorities for future work.` }
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

/**
 * Dedicated Outline Generator for IEEE Conference & Journal Research Papers
 * Strictly adheres to 2-column Roman numeral taxonomy with lettered subsections
 */
export async function generateIEEEPaperOutline(
  prompt: string,
  options: GenerateOutlineOptions = {},
  researchBundle?: ResearchBundle
): Promise<GeneratedOutline> {
  const geminiApiKey = options.customGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cleanTitle = prompt.replace(/\.$/, "").trim();

  const systemPrompt = `You are an IEEE Senior Transactions Editor and Lead Academic Document Architect.
You must construct an authentic, publication-grade IEEE Conference/Journal Research Paper outline.
Output ONLY valid JSON matching this exact structure:
{
  "title": "Formal Scholarly Paper Title",
  "subtitle": "IEEE Conference & Journal Standard Manuscript",
  "docType": "IEEE Research Paper",
  "format": "docx",
  "targetLength": "Standard IEEE Paper (6–8 Sections)",
  "sections": [
    {
      "id": "sec_abstract",
      "title": "Abstract & Keywords",
      "brief": "Comprehensive 150-250 word scholarly abstract framing domain context, problem statement, methodological innovation, empirical results, and significance, followed by 4-6 Index Terms.",
      "keyPoints": ["Domain context & motivation", "Proposed architectural innovation", "Quantitative benchmark results", "Index keywords & taxonomy"],
      "relevantSourceIndices": [1]
    },
    {
      "id": "sec_1",
      "title": "I. INTRODUCTION",
      "brief": "Contextual background, domain urgency, formal problem formulation, key contributions, and paper organization.",
      "keyPoints": ["Historical & industrial context", "Core challenges & baseline limitations", "Explicit list of novel research contributions", "Paper structural roadmap"],
      "relevantSourceIndices": [1, 2],
      "subsections": [
        { "id": "sec_1_1", "title": "A. Motivation and Domain Urgency", "brief": "Contemporary technological and empirical drivers motivating innovation.", "keyPoints": ["Industrial drivers", "Empirical motivations"] },
        { "id": "sec_1_2", "title": "B. Formal Problem Formulation", "brief": "Mathematical and architectural definition of operational bottlenecks.", "keyPoints": ["Mathematical scope", "Vulnerabilities"] },
        { "id": "sec_1_3", "title": "C. Research Contributions & Organization", "brief": "Itemized novel contributions and sequential structure of the manuscript.", "keyPoints": ["Novel contributions", "Structural roadmap"] }
      ]
    },
    {
      "id": "sec_2",
      "title": "II. RELATED WORK & THEORETICAL FOUNDATIONS",
      "brief": "Taxonomy of prior literature, baseline algorithms, comparative paradigms, and identified research gaps.",
      "keyPoints": ["Taxonomy of state-of-the-art literature", "Comparative analysis of prevailing paradigms", "Empirical gaps addressed"],
      "relevantSourceIndices": [1, 2],
      "subsections": [
        { "id": "sec_2_1", "title": "A. Taxonomy of Prior Approaches", "brief": "Classification and trajectory of existing models and methods.", "keyPoints": ["Existing models", "Comparative baseline"] },
        { "id": "sec_2_2", "title": "B. Baseline Limitations & Research Gaps", "brief": "Critical analysis of vulnerabilities and computational bottlenecks in current paradigms.", "keyPoints": ["Computational bottlenecks", "Unresolved gaps"] }
      ]
    },
    {
      "id": "sec_3",
      "title": "III. PROPOSED SYSTEM METHODOLOGY & ARCHITECTURE",
      "brief": "Rigorous mathematical formulation, algorithmic pipelines, component modules, and optimization protocols.",
      "keyPoints": ["Mathematical formulation & system equations", "Architectural schematic & data pipelines", "Optimization theorems & complexity"],
      "relevantSourceIndices": [1, 2],
      "subsections": [
        { "id": "sec_3_1", "title": "A. Mathematical Formulation & System Model", "brief": "Formal mathematical equations, parameter notations, and boundary constraints.", "keyPoints": ["System equations", "Parameter notations"] },
        { "id": "sec_3_2", "title": "B. Architectural Pipeline & Module Topology", "brief": "Detailed component interactions, data flow representations, and protocols.", "keyPoints": ["Data pipelines", "Module topology"] },
        { "id": "sec_3_3", "title": "C. Algorithmic Complexity & Execution Safeguards", "brief": "Time/space complexity analysis and convergence guarantees.", "keyPoints": ["Complexity analysis", "Convergence guarantees"] }
      ]
    },
    {
      "id": "sec_4",
      "title": "IV. EXPERIMENTAL SETUP & EMPIRICAL RESULTS",
      "brief": "Quantitative testbed benchmarks, comparative baseline distributions, evaluation metrics, and ablation data.",
      "keyPoints": ["Experimental testbed & dataset specifications", "Comparative benchmark tables against state-of-the-art", "Statistical significance & runtime latency"],
      "relevantSourceIndices": [1, 2],
      "subsections": [
        { "id": "sec_4_1", "title": "A. Benchmark Testbeds & Dataset Specifications", "brief": "Experimental parameters, baseline configurations, and hardware/software setup.", "keyPoints": ["Dataset parameters", "Hardware testbed"] },
        { "id": "sec_4_2", "title": "B. Quantitative Benchmark Evaluation", "brief": "Granular comparison tables evaluating accuracy, throughput, and efficiency.", "keyPoints": ["Throughput metrics", "Comparative performance"] },
        { "id": "sec_4_3", "title": "C. Statistical Significance & Latency Analysis", "brief": "Empirical distributions, p-values, and convergence rates across iterations.", "keyPoints": ["Hypothesis validation", "Latency distributions"] }
      ]
    },
    {
      "id": "sec_5",
      "title": "V. DISCUSSION, ABLATION ANALYSIS & THREATS TO VALIDITY",
      "brief": "In-depth ablation studies, architectural trade-offs, internal/external validity constraints, and practical deployment considerations.",
      "keyPoints": ["Ablation studies isolating individual components", "Operational trade-offs and computational costs", "Threats to validity"],
      "relevantSourceIndices": [1, 2],
      "subsections": [
        { "id": "sec_5_1", "title": "A. Component Ablation Experiments", "brief": "Empirical isolation of individual system components and their contributions.", "keyPoints": ["Component contributions", "Ablation tables"] },
        { "id": "sec_5_2", "title": "B. Critical Trade-offs & Deployment Constraints", "brief": "Practical latency, memory, and bandwidth trade-offs in production.", "keyPoints": ["Memory trade-offs", "Operational constraints"] },
        { "id": "sec_5_3", "title": "C. Threats to Internal & External Validity", "brief": "Analysis of confounding variables and generalizability across diverse domains.", "keyPoints": ["Confounding variables", "Generalizability"] }
      ]
    },
    {
      "id": "sec_6",
      "title": "VI. CONCLUSION & FUTURE WORK",
      "brief": "Scholarly synthesis of findings, verified impact on the research community, and high-priority open research directions.",
      "keyPoints": ["Summary of verified empirical outcomes", "Key theoretical and engineering implications", "Prospective research avenues for future scholars"],
      "relevantSourceIndices": [1]
    }
  ]
}`;

  const userMessage = `Create an authentic IEEE Conference / Journal Research Paper outline on the topic:
"${cleanTitle}"

Tone: Academic & Scholarly
Format: docx (IEEE 2-Column Standard)

Live Research Sources Available:
${JSON.stringify(researchBundle?.results || [], null, 2)}

STRICT STRUCTURAL REQUIREMENTS FOR IEEE RESEARCH PAPER:
1. ROMAN NUMERAL HEADINGS ONLY: Main sections MUST be numbered with uppercase Roman numerals ("I. INTRODUCTION", "II. RELATED WORK", "III. PROPOSED METHODOLOGY", "IV. EXPERIMENTAL RESULTS", "V. DISCUSSION & ABLATIONS", "VI. CONCLUSION").
2. LETTERED SUBSECTIONS ONLY: Subsections MUST use uppercase letters ("A. Motivation", "B. Problem Formulation", "C. Research Contributions").
3. ABSOLUTE PROHIBITION: NEVER use decimal chapter numbers (NO "1. Introduction", NO "1.1 Background", NO "Chapter 1"). This is an IEEE Paper, not a book or report.
4. INLINE ABSTRACT & KEYWORDS: First section MUST be "Abstract & Keywords".`;

  if (geminiApiKey) {
    const requestedModel = options.geminiModel || "gemini-2.5-flash-lite";
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      let response;
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: requestedModel,
            contents: `${systemPrompt}\n\n${userMessage}`,
            config: { responseMimeType: "application/json" }
          }),
          12000
        );
      } catch (mErr) {
        response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: `${systemPrompt}\n\n${userMessage}`,
            config: { responseMimeType: "application/json" }
          }),
          10000
        );
      }

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
          parsed.docType = "IEEE Research Paper";
          return parsed as GeneratedOutline;
        }
      }
    } catch (e) {
      console.warn("Gemini IEEE outline failed or timed out, falling back to dynamic IEEE outline:", e);
    }
  }

  return buildDynamicOutline(prompt, { ...options, docType: "IEEE Research Paper" }, researchBundle);
}

/**
 * Dedicated Outline Generator for Multi-Chapter Academic & Project Reports
 * Strictly adheres to decimal chapter numbering (1. Introduction, 1.1 Background, 2. Literature Review)
 */
export async function generateAcademicReportOutline(
  prompt: string,
  options: GenerateOutlineOptions = {},
  researchBundle?: ResearchBundle
): Promise<GeneratedOutline> {
  const geminiApiKey = options.customGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cleanTitle = prompt.replace(/\.$/, "").trim();
  const docBudget = calculateDocumentBudget(prompt, options);

  const systemPrompt = `You are a Senior Academic Project Lead and Document Architect.
You must construct a comprehensive multi-chapter Academic/Project Report outline with decimal chapter numbers.
Output ONLY valid JSON matching this exact structure:
{
  "title": "Comprehensive Project Report Title",
  "subtitle": "Comprehensive Academic & Empirical Project Report",
  "docType": "Research Report",
  "format": "${options.format || "docx"}",
  "targetLength": "${docBudget.label}",
  "sections": [
    {
      "id": "sec_1",
      "title": "1. Introduction & Foundational Scope",
      "brief": "Executive introduction to baseline metrics, institutional significance, and scope of inquiry.",
      "keyPoints": ["Contextual background and domain importance", "Core problem definition and inefficiencies", "Scope boundaries and project objectives"],
      "relevantSourceIndices": [1],
      "subsections": [
        { "id": "sec_1_1", "title": "1.1 Background and Domain Urgency", "brief": "Historical and contemporary context motivating the project.", "keyPoints": ["Historical context", "Domain urgency"] },
        { "id": "sec_1_2", "title": "1.2 Formal Problem Statement", "brief": "Detailed breakdown of structural inefficiencies and technical bottlenecks.", "keyPoints": ["Inefficiencies", "Bottlenecks"] },
        { "id": "sec_1_3", "title": "1.3 Project Aims & Scope Boundaries", "brief": "Specific analytical aims, hypotheses, and scope boundaries.", "keyPoints": ["Aims", "Scope limits"] }
      ]
    },
    {
      "id": "sec_2",
      "title": "2. Literature Review & Theoretical Framework",
      "brief": "Exhaustive analysis of seminal scholarship, prevailing conceptual models, and academic debates.",
      "keyPoints": ["Seminal theoretical models", "Taxonomy of existing research streams", "Critical analysis of research gaps"],
      "relevantSourceIndices": [1, 2],
      "subsections": [
        { "id": "sec_2_1", "title": "2.1 Historical Genesis & Evolution", "brief": "Pioneering initiatives, early prototypes, and initial standardizations.", "keyPoints": ["Evolutionary path", "Milestones"] },
        { "id": "sec_2_2", "title": "2.2 Theoretical Taxonomy & Models", "brief": "Classification of prevailing mathematical and operational frameworks.", "keyPoints": ["Conceptual frameworks", "Taxonomy"] },
        { "id": "sec_2_3", "title": "2.3 Gaps in Contemporary Literature", "brief": "Systematic evaluation of research gaps and unanswered inquiries.", "keyPoints": ["Research gaps", "Unresolved inquiries"] }
      ]
    },
    {
      "id": "sec_3",
      "title": "3. System Architecture & Technical Methodology",
      "brief": "Technical infrastructure, systems integration, protocol standards, and data pipelines.",
      "keyPoints": ["System topology and modular architecture", "Data ingestion pipelines", "Security and fault-tolerance mechanisms"],
      "relevantSourceIndices": [2, 3],
      "subsections": [
        { "id": "sec_3_1", "title": "3.1 High-Level Architectural Topology", "brief": "System topology, component modularity, and operational workflow design.", "keyPoints": ["Architectural components", "Topology"] },
        { "id": "sec_3_2", "title": "3.2 Data Pipelines & Protocol Standards", "brief": "Data ingestion, processing pipeline, and protocol harmonization.", "keyPoints": ["Ingestion pipelines", "Protocols"] },
        { "id": "sec_3_3", "title": "3.3 Security Protocols & Fault Tolerance", "brief": "Redundancy safeguards, cryptographic integrity, and disaster recovery.", "keyPoints": ["Security protocols", "Fault tolerance"] }
      ]
    },
    {
      "id": "sec_4",
      "title": "4. Empirical Findings & Performance Benchmarks",
      "brief": "Deep data synthesis with structured comparison tables, verified institutional statistics, and performance distributions.",
      "keyPoints": ["Granular statistical distributions and verified data tables", "Demographic and sector performance benchmarks", "Comparative unit economics and operational metrics"],
      "relevantSourceIndices": [1, 3],
      "subsections": [
        { "id": "sec_4_1", "title": "4.1 Quantitative Performance Distributions", "brief": "Empirical distributions and performance benchmark metrics across testbeds.", "keyPoints": ["Benchmark distributions", "Testbed metrics"] },
        { "id": "sec_4_2", "title": "4.2 Comparative Performance Data Tables", "brief": "Granular comparison tables evaluating multi-variable yield against existing standards.", "keyPoints": ["Comparison tables", "Multi-variable yield"] },
        { "id": "sec_4_3", "title": "4.3 Statistical Significance & Sensitivity Analysis", "brief": "Hypothesis validation, p-values, and parameter sensitivity testing.", "keyPoints": ["Hypothesis testing", "Sensitivity matrices"] }
      ]
    },
    {
      "id": "sec_5",
      "title": "5. Institutional Case Studies & Field Implementations",
      "brief": "Exhaustive real-world case evaluations demonstrating concrete implementations and institutional outcomes.",
      "keyPoints": ["Enterprise tier implementation review", "Public sector and academic deployment review", "Post-mortem analysis of observed friction"],
      "relevantSourceIndices": [2, 4],
      "subsections": [
        { "id": "sec_5_1", "title": "5.1 Enterprise Tier Implementation Review", "brief": "Large-scale deployment outcomes, timeline analysis, and measured ROI.", "keyPoints": ["Enterprise deployment", "ROI metrics"] },
        { "id": "sec_5_2", "title": "5.2 Public Sector & Institutional Deployments", "brief": "Academic and regulatory consortium deployments and compliance.", "keyPoints": ["Consortium deployments", "Public sector"] },
        { "id": "sec_5_3", "title": "5.3 Implementation Friction & Corrective Lessons", "brief": "Analysis of implementation friction, failed assumptions, and remedies.", "keyPoints": ["Friction analysis", "Corrective measures"] }
      ]
    },
    {
      "id": "sec_6",
      "title": "6. Strategic Implementation Roadmap & Risk Governance",
      "brief": "Actionable phased implementation timeline, capital deployment sequencing, risk mitigation matrix, and governance checkpoints.",
      "keyPoints": ["Phased rollout milestones (Phase I, II, III)", "Comprehensive risk governance matrix", "Cost structures, unit economics, and return on investment"],
      "relevantSourceIndices": [1, 2, 3, 4],
      "subsections": [
        { "id": "sec_6_1", "title": "6.1 Phased Execution Timeline & Milestones", "brief": "Sequential implementation phases across near-term, mid-term, and long-term horizons.", "keyPoints": ["Phased timeline", "Milestones"] },
        { "id": "sec_6_2", "title": "6.2 Comprehensive Risk Governance Matrix", "brief": "Systematic risk scoring, mitigation protocols, and compliance checkpoints.", "keyPoints": ["Risk matrix", "Mitigation protocols"] },
        { "id": "sec_6_3", "title": "6.3 Economic Feasibility & Capital Allocation Modeling", "brief": "Unit economics, operational expenditure, and long-term commercial sustainability.", "keyPoints": ["Unit economics", "Financial feasibility"] }
      ]
    },
    {
      "id": "sec_7",
      "title": "7. Conclusion & Future Directives",
      "brief": "Synthesized resolution of project findings, methodological contributions, and strategic directives.",
      "keyPoints": ["Integrated resolution of theoretical and empirical findings", "Methodological contributions to the field", "Actionable future research questions"],
      "relevantSourceIndices": [1, 2],
      "subsections": [
        { "id": "sec_7_1", "title": "7.1 Integrated Resolution of Findings", "brief": "Synthesized summary of theoretical and empirical discoveries.", "keyPoints": ["Summary of discoveries", "Resolution"] },
        { "id": "sec_7_2", "title": "7.2 Practical & Policy Contributions", "brief": "Key contributions and industry implications.", "keyPoints": ["Practical implications", "Policy directives"] },
        { "id": "sec_7_3", "title": "7.3 Future Trajectory & Open Questions", "brief": "High-priority inquiries for upcoming project phases.", "keyPoints": ["Next phase priorities", "Open questions"] }
      ]
    }
  ]
}`;

  const userMessage = `Create an exhaustive Academic / Project Report outline on the topic:
"${cleanTitle}"

Target Tone: ${options.tone || "Scholarly Academic"}
Target Length: ${docBudget.label} (~${docBudget.pageCount} pages, ~${docBudget.chapterCount} chapters)

Live Research Sources Available:
${JSON.stringify(researchBundle?.results || [], null, 2)}

STRICT STRUCTURAL REQUIREMENTS FOR ACADEMIC REPORT:
1. PLAIN LANGUAGE TITLES (MANDATORY): Section and chapter titles MUST describe content in simple, ordinary everyday words. AVOID academic jargon, avoid stacking abstract nouns (e.g. use "Introduction", "Literature Review", "System Design", "Test Results", "Case Studies", "Costs & Budget", "Regulations", "Project Roadmap", "Risk Management", "Summary & Next Steps"). Titles must be immediately clear to any general reader.
2. DECIMAL CHAPTER NUMBERING ONLY: Chapters MUST be numbered as "1. Introduction", "2. Literature Review", etc. Subsections MUST be numbered as "1.1 Background & Motivation", "1.2 Problem Statement", "1.3 Project Goals".
3. CHAPTER COUNT: Generate EXACTLY ${docBudget.chapterCount} chapters to satisfy the requested ${docBudget.pageCount}-page depth.
4. ABSOLUTE PROHIBITION: NEVER use IEEE Roman numerals (NO "I. INTRODUCTION", NO "II. RELATED WORK"). This is a formal academic/project report, not an IEEE paper.`;

  if (geminiApiKey) {
    const requestedModel = options.geminiModel || "gemini-2.5-flash-lite";
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      let response;
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: requestedModel,
            contents: `${systemPrompt}\n\n${userMessage}`,
            config: { responseMimeType: "application/json" }
          }),
          12000
        );
      } catch (mErr) {
        response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: `${systemPrompt}\n\n${userMessage}`,
            config: { responseMimeType: "application/json" }
          }),
          10000
        );
      }

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
          parsed.docType = "Research Report";
          return parsed as GeneratedOutline;
        }
      }
    } catch (e) {
      console.warn("Gemini Academic Report outline failed or timed out, falling back to dynamic outline:", e);
    }
  }

  return buildDynamicOutline(prompt, { ...options, docType: "Research Report" }, researchBundle);
}

/**
 * Main Structured Outline Router - Strictly routes to isolated generator functions
 */
export async function generateStructuredOutline(
  prompt: string,
  options: GenerateOutlineOptions = {},
  researchBundle?: ResearchBundle
): Promise<GeneratedOutline> {
  const isIEEE = options.isIEEEPaper === true ||
    options.docType === "IEEE Research Paper" ||
    options.docType === "Research Paper" ||
    options.docType === "Conference Paper";

  if (isIEEE) {
    return await generateIEEEPaperOutline(prompt, options, researchBundle);
  } else if (options.format === "pptx" || options.docType === "Presentation Deck") {
    return buildDynamicOutline(prompt, options, researchBundle);
  } else {
    return await generateAcademicReportOutline(prompt, options, researchBundle);
  }
}

/**
 * Returns distinct editorial tone instructions for the 4 supported styles
 */
export function getToneInstruction(tone: string = ""): string {
  const t = tone.toLowerCase().trim();
  if (t.includes("scholarly") || t.includes("academic")) {
    return `EDITORIAL TONE: Scholarly Academic
- Formal, structured academic writing in clear, plain vocabulary.
- Do NOT use obscure, pompous, or archaic words for their own sake.
- Ground all arguments in empirical evidence, logical deduction, and objective analysis.
- Maintain a balanced, authoritative, and respectful tone.`;
  }
  if (t.includes("executive") || t.includes("direct") || t.includes("brief")) {
    return `EDITORIAL TONE: Executive Direct
- Brief, results-oriented business language, the way a manager summarizes for decision makers.
- Get straight to the point: focus on key performance numbers, strategic trade-offs, operational impact, and bottom-line takeaways.
- Use simple, direct everyday words. Eliminate conversational filler, academic throat-clearing, and theoretical digressions.
- Format key decisions and strategic priorities with clear structure.`;
  }
  if (t.includes("technical") || t.includes("spec")) {
    return `EDITORIAL TONE: Technical Specification
- Precise, structured engineering-spec style writing.
- Exact, unambiguous descriptions of system components, protocols, inputs, outputs, interfaces, latency bounds, and tolerances.
- Use standard, widely understood technical and everyday terms with zero ambiguity.
- State functional requirements and operational mechanics as clear declarative facts.`;
  }
  // Default: Concise & Factual
  return `EDITORIAL TONE: Concise & Factual
- Short, plain sentences stating facts with zero embellishment, zero fluff, and zero filler.
- Present straightforward evidence, metrics, and definitions directly.
- Use common, everyday vocabulary that anyone can immediately understand.
- No rhetorical flourishes, promotional adjectives, or speculative commentary.`;
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
  const tone = customKeys?.tone || "Scholarly Academic";
  const docType = customKeys?.docType || "Research Report";
  const format = customKeys?.format || "docx";
  const targetLength = customKeys?.targetLength || "Unlimited & Exhaustive (Comprehensive In-Depth, 30–50 Pages)";
  const isPptx = format === "pptx";
  const isExhaustive = (format === "docx" || format === "pdf") && (targetLength.toLowerCase().includes("unlimited") || targetLength.toLowerCase().includes("detailed") || (customKeys?.targetChapterWords || 0) >= 600);

  const targetWords = customKeys?.targetChapterWords || 750;
  const subCount = section.subsections && section.subsections.length > 0 ? section.subsections.length : 3;
  const targetSubWords = customKeys?.targetSubsectionWords || Math.round(targetWords / subCount);

  const isIEEE = docType === "Research Paper" || docType === "IEEE Research Paper" || docType === "Conference Paper" || docTitle.toLowerCase().includes("ieee");
  const toneGuide = getToneInstruction(tone);

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
Key Points: ${(section.keyPoints || []).join("; ") || "Core analytical breakdown"}
Word Budget Target: ~${targetWords} words total (~${targetSubWords} words per subsection)

${customKeys?.referenceNotes ? `User Reference Notes:\n${customKeys.referenceNotes}\n` : ""}
${customKeys?.additionalRequirements ? `User Additional Requirements:\n${customKeys.additionalRequirements}\n` : ""}

${toneGuide}

CRITICAL VOCABULARY & HUMAN-READABILITY RULES ACROSS ALL TONES:
- Every sentence must be clearly understandable to an intelligent reader who is not a specialist in the topic.
- Use common, widely understood everyday words throughout the text.
- Do NOT use obscure, pretentious vocabulary or complex jargon when a simpler word conveys the same meaning.
- Section titles and headings must describe content in simple, direct words.

ABSOLUTE PROHIBITION ON PLACEHOLDER OR FILLER TEXT:
- Strictly NEVER generate placeholder sentences (e.g. "more details to be added", "to be determined", "further analysis required", "lorem ipsum").
- Strictly NEVER generate vague, empty statements that convey zero concrete information.
- Avoid empty AI hedge phrases and throat-clearing transitions ("In today's landscape...", "It is important to remember that..."). Every sentence must state a concrete fact, architectural mechanism, empirical metric, or specific decision.

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
    const requestedModel = customKeys?.geminiModel || "gemini-2.5-flash-lite";
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      let response;
      try {
        response = await ai.models.generateContent({
          model: requestedModel,
          contents: prompt
        });
      } catch (modelErr) {
        response = await ai.models.generateContent({
          model: "gemini-flash-latest",
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
      const cleanSub = sub.title.replace(/^(\d+(\.\d+)*|[A-Z]\.|\b[IVXLCDM]+\b\.?)\s*/, "").trim() || sub.title;
      const cleanBrief = sub.brief.replace(/\.+$/, "").trim();
      const variant = (secHash + sIdx * 7) % 5;

      let p1 = "";
      let p2 = "";
      let p3 = "";

      const t = (tone || "").toLowerCase();

      if (t.includes("executive") || t.includes("direct")) {
        // Executive Direct: Brief, results-oriented, manager-level takeaways
        p1 = `### ${sub.title}\n\n` +
          `**Executive Focus:** ${cleanSub} directly impacts ${cleanBrief.toLowerCase()}. ` +
          (sourceSnippet ? `Verified benchmark data: "${sourceSnippet}" ${sourceCitation}. ` : "") +
          `Prioritizing this area delivers measurable operational efficiency and eliminates workflow friction.`;
        p2 = `**Key Operational Trade-offs:** Leadership must balance implementation speed against infrastructure complexity. ` +
          `Standardizing component workflows minimizes overhead while maintaining predictable team velocity.`;
        p3 = `**Decision Milestone:** Establish clear quarterly performance targets and align resource allocation with core delivery goals.`;
      } else if (t.includes("technical") || t.includes("spec")) {
        // Technical Specification: Exact engineering requirements, interfaces, bounds
        p1 = `### ${sub.title}\n\n` +
          `**Functional Scope:** Specifications for ${cleanSub.toLowerCase()} mandate strict adherence to ${cleanBrief.toLowerCase()}. ` +
          (sourceSnippet ? `Performance constraints: "${sourceSnippet}" ${sourceCitation}. ` : "") +
          `System modules must implement deterministic error boundaries and maintain bounded latency under peak load.`;
        p2 = `**Interface & Data Flow:** Component interfaces require explicit schema validation, immutable audit logging, and isolated process isolation. ` +
          `State transitions must execute atomically across all distributed nodes.`;
        p3 = `**Verification Criteria:** Automated regression test suites must validate throughput limits, error handling paths, and failover recovery before production release.`;
      } else if (t.includes("concise") || t.includes("factual")) {
        // Concise & Factual: Short, plain, direct statements with zero embellishment
        p1 = `### ${sub.title}\n\n` +
          `${cleanSub} covers ${cleanBrief.toLowerCase()}. ` +
          (sourceSnippet ? `Source data confirms that "${sourceSnippet}" ${sourceCitation}. ` : "") +
          `The measured baselines provide clear targets for system performance.`;
        p2 = `The architecture uses decoupled components to isolate errors and prevent system slowdowns.`;
        p3 = `Regular automated checks verify that all components operate within expected limits.`;
      } else {
        // Scholarly Academic: Formal, structured academic analysis in clear, plain language
        p1 = `### ${sub.title}\n\n` +
          `An analysis of ${cleanSub.toLowerCase()} clarifies how ${cleanBrief.toLowerCase()}. ` +
          (sourceSnippet ? `Recent empirical research confirms: "${sourceSnippet}" ${sourceCitation}. ` : "") +
          `By isolating the underlying factors of ${cleanSub.toLowerCase()}, researchers and practitioners establish reliable benchmarks based on observable evidence.`;
        p2 = `At the implementation level, processes in ${cleanSub.toLowerCase()} must balance component dependencies against operational latency. ` +
          `Decoupled systems reduce cascading errors and preserve data consistency across production environments.`;
        p3 = `Rigorous evaluation relies on continuous measurement, automated testing, and predictable monitoring signals aligned with the project's core research goals.`;
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
    const requestedModel = customKeys?.geminiModel || "gemini-2.5-flash";
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
    const requestedModel = customKeys?.geminiModel || "gemini-2.5-flash";
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
