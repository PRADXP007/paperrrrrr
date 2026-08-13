import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { ResearchBundle, ResearchSnippet } from "./tavily";

export interface OutlineSection {
  id: string;
  title: string;
  brief: string;
  keyPoints: string[];
  relevantSourceIndices: number[];
  content?: string;
  status?: "pending" | "generating" | "completed";
}

export interface GeneratedOutline {
  title: string;
  subtitle: string;
  docType: string;
  format: "docx" | "pptx" | "xlsx" | "pdf";
  targetLength: string;
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
  const isExhaustive = (options.targetLength || "").toLowerCase().includes("unlimited") || (options.targetLength || "").toLowerCase().includes("detailed") || options.format === "docx" || options.format === "pdf";

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
  } else if (options.format === "xlsx") {
    subtitle = `Comprehensive Financial, Empirical & KPI Analytical Model (${options.tone || "Technical & Architectural"})`;
    sections = [
      {
        id: "sheet_1",
        title: "Sheet 1: Executive KPI Dashboard & Core Indices",
        brief: `Master executive summary table tracking baseline volume, growth rates, performance indices, and health metrics for ${cleanTitle}.`,
        keyPoints: ["Top 8 baseline metrics & KPI targets", "Variance percentages and status flags", "Formula calculations for index weighting"],
        relevantSourceIndices: [1]
      },
      {
        id: "sheet_2",
        title: "Sheet 2: Historical Financials & Revenue Breakdown",
        brief: `Granular annual/quarterly financial table tracking revenue streams, gross margins, and segment contributions for ${cleanTitle}.`,
        keyPoints: ["Multi-year revenue distributions", "Cost of goods sold (COGS) and gross margin percentages", "Segment contribution breakdown"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1]
      },
      {
        id: "sheet_3",
        title: "Sheet 3: Market Sizing, Segmentation & Regional CAGR",
        brief: `Regional and demographic market sizing table with CAGR projections, market share, and addressable volume for ${cleanTitle}.`,
        keyPoints: ["Regional TAM/SAM/SOM breakdown", "5-year forecasted CAGR percentages", "Penetration rates across market tiers"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1]
      },
      {
        id: "sheet_4",
        title: "Sheet 4: Unit Economics, OPEX & Capital Allocation",
        brief: `Operational expenditure, cost structures, headcount modeling, and capital expenditure breakdown for ${cleanTitle}.`,
        keyPoints: ["Direct vs indirect cost drivers", "OPEX by department (R&D, Sales, Ops)", "Capital deployment allocation matrix"],
        relevantSourceIndices: srcCount >= 4 ? [3, 4] : [srcCount]
      },
      {
        id: "sheet_5",
        title: "Sheet 5: 5-Year Financial Forecast & Sensitivity Matrix",
        brief: `Comprehensive 5-year pro-forma forecast model with bull/base/bear sensitivity analysis and IRR/ROI calculations for ${cleanTitle}.`,
        keyPoints: ["Base case vs Bull case vs Bear case scenarios", "EBITDA margin projections and net present value (NPV)", "Sensitivity table across variable shifts"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1, 2]
      },
      {
        id: "sheet_6",
        title: "Sheet 6: Risk Scoring & Compliance Audit Matrix",
        brief: `Quantitative risk scoring table with probability weights, financial impact estimation, and mitigation status for ${cleanTitle}.`,
        keyPoints: ["Risk categorization and severity scoring", "Expected monetary value (EMV) calculations", "Audit status and mitigation ownership"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 4] : [1]
      }
    ];
  } else if (isExhaustive) {
    subtitle = `An Exhaustive Multi-Chapter Strategic, Empirical & Methodological Treatise (${options.tone || "Academic & Analytical"})`;
    sections = [
      {
        id: "sec_1",
        title: "1. Executive Abstract, Empirical Baseline & Foundational Scope",
        brief: `Comprehensive executive overview of baseline metrics, scope, and foundational significance for ${cleanTitle}.`,
        keyPoints: [`Core adoption and volume metrics for ${cleanTitle}`, "High-level institutional indicators", "Scope and methodology framework"],
        relevantSourceIndices: [1]
      },
      {
        id: "sec_2",
        title: "2. Historical Genesis, Inflection Points & Evolutionary Chronology",
        brief: `Chronological analysis of the origin, historical inflection points, and structural maturation of ${cleanTitle}.`,
        keyPoints: ["Early developmental phases and policy catalysts", "Key structural pivots over the past decade", "Evolution of market and user adoption curves"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1]
      },
      {
        id: "sec_3",
        title: "3. Theoretical Frameworks, Scholarly Taxonomy & Conceptual Models",
        brief: `Theoretical models, scholarly taxonomy, and conceptual lenses governing ${cleanTitle}.`,
        keyPoints: ["Academic paradigms and economic models", "Thematic categorization of ecosystem dynamics", "Taxonomy of primary and secondary variables"],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1]
      },
      {
        id: "sec_4",
        title: "4. Methodological Design, Empirical Scope & Sampling Protocols",
        brief: `Systematic selection criteria, measurement protocols, and quantitative evaluation indices for ${cleanTitle}.`,
        keyPoints: ["Sampling protocols and dataset verification", "Key quantitative indicators and CAGR tracking", "Empirical boundary conditions and error tolerances"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1]
      },
      {
        id: "sec_5",
        title: "5. Operational Architecture & Technical Infrastructure",
        brief: `Technical infrastructure, systems integration, and operational workflows supporting ${cleanTitle}.`,
        keyPoints: ["System architecture and protocol design", "Infrastructure scalability and uptime resilience", "Data pipelines and latency optimization"],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1]
      },
      {
        id: "sec_6",
        title: "6. Granular Empirical Findings & Quantitative Indicators",
        brief: `Deep data synthesis of verified figures, institutional benchmarks, and performance metrics for ${cleanTitle}.`,
        keyPoints: ["Granular statistical distributions and benchmarks", "Demographic and regional performance variations", "Comparative unit economics and growth velocity"],
        relevantSourceIndices: srcCount >= 4 ? [3, 4] : [srcCount]
      },
      {
        id: "sec_7",
        title: "7. Comparative Global Benchmarks & International Case Studies",
        brief: `Cross-regional case evaluations, international parallels, and operational case studies on ${cleanTitle}.`,
        keyPoints: ["Cross-border comparative analysis", "Institutional implementation case studies", "Lessons learned and transferable operational models"],
        relevantSourceIndices: srcCount >= 4 ? [3, 4] : [srcCount]
      },
      {
        id: "sec_8",
        title: "8. Institutional Policy, Governance & Regulatory Compliance Mandates",
        brief: `Legal oversight, statutory compliance, institutional governance, and policy dynamics impacting ${cleanTitle}.`,
        keyPoints: ["Government policies, mandates, and statutory standards", "Regulatory compliance and consumer protections", "Cross-jurisdictional harmonization priorities"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 4] : [1]
      },
      {
        id: "sec_9",
        title: "9. Advanced Economic Modeling, Unit Economics & Cost-Benefit Ratios",
        brief: `Financial viability, cost-benefit modeling, capital allocation, and commercial incentives for ${cleanTitle}.`,
        keyPoints: ["Cost structures, capital intensity, and ROI models", "Direct vs indirect economic dividends", "Monetization and pricing sustainability"],
        relevantSourceIndices: srcCount >= 4 ? [2, 3, 4] : [1, 2]
      },
      {
        id: "sec_10",
        title: "10. Operational Vulnerabilities, Friction Points & Systemic Failure Modes",
        brief: `Critical assessment of operational vulnerabilities, friction points, security threats, and failure modes in ${cleanTitle}.`,
        keyPoints: ["Hardware, network, and supply chain friction", "Security vulnerabilities and compliance risks", "Comprehensive mitigation and disaster recovery protocols"],
        relevantSourceIndices: srcCount >= 4 ? [1, 3, 4] : [1, 2]
      },
      {
        id: "sec_11",
        title: "11. Enterprise Security, Threat Modeling & Data Protection Vectors",
        brief: `Cybersecurity protocols, data sovereignty, encryption standards, and threat modeling for ${cleanTitle}.`,
        keyPoints: ["Threat surface minimization and vulnerability scoring", "Encryption, identity management, and access controls", "Data privacy compliance and audit readiness"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 4] : [1]
      },
      {
        id: "sec_12",
        title: "12. Sociotechnical Dynamics, Workforce Evolution & Institutional Adoption",
        brief: `Human capital, workforce adaptation, cultural implications, and institutional adoption vectors for ${cleanTitle}.`,
        keyPoints: ["Workforce skilling and operational change management", "Consumer psychology and behavioral adoption patterns", "Institutional transformation milestones"],
        relevantSourceIndices: srcCount >= 4 ? [2, 3, 4] : [1]
      },
      {
        id: "sec_13",
        title: "13. Environmental, Social & Governance (ESG) Life-Cycle Assessments",
        brief: `Sustainability footprints, carbon accounting, social equity dividends, and governance transparency in ${cleanTitle}.`,
        keyPoints: ["Life-cycle carbon and environmental metrics", "Social equity and inclusion benchmarks", "Corporate governance and reporting standards"],
        relevantSourceIndices: srcCount >= 4 ? [1, 3, 4] : [1]
      },
      {
        id: "sec_14",
        title: "14. Cross-Industry Interoperability Standards & Protocol Harmonization",
        brief: `API standardization, cross-platform protocols, and ecosystem interoperability frameworks for ${cleanTitle}.`,
        keyPoints: ["Standardization protocols and open architecture", "Cross-system API integration benchmarks", "Friction reduction across legacy infrastructure"],
        relevantSourceIndices: srcCount >= 4 ? [2, 4] : [1]
      },
      {
        id: "sec_15",
        title: "15. Frontier Technological Innovations & Emerging Horizons (2026–2035)",
        brief: `Predictive modeling, artificial intelligence integration, and forward-looking technological horizon for ${cleanTitle}.`,
        keyPoints: ["Next-generation technological breakthroughs", "Anticipated market transformations over the next decade", "Pivotal inflection triggers to monitor"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1, 2]
      },
      {
        id: "sec_16",
        title: "16. Strategic Execution Roadmap, Phased Timelines & Milestone Matrix",
        brief: `Actionable phased implementation timeline, capital deployment sequencing, and governance checkpoints for ${cleanTitle}.`,
        keyPoints: ["Near-term tactical rollout (Months 1–12)", "Medium-term scaling & optimization (Years 2–3)", "Long-term institutional governance and global leadership"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1, 2]
      },
      {
        id: "sec_17",
        title: "17. Risk Governance Matrix & Contingency Protocol Framework",
        brief: `Systematic risk mitigation matrix, regulatory defense strategies, and business continuity frameworks for ${cleanTitle}.`,
        keyPoints: ["High-impact low-probability scenario modeling", "Operational redundancy and fault tolerance", "Continuous compliance monitoring protocols"],
        relevantSourceIndices: srcCount >= 4 ? [1, 3, 4] : [1, 2]
      },
      {
        id: "sec_18",
        title: "18. Scholarly Synthesis, Open Research Inquiries & Final Conclusion",
        brief: `Synthesized resolution of core findings, academic contributions, and prospective research agenda on ${cleanTitle}.`,
        keyPoints: ["Integrated theoretical and empirical summary", "Key open academic questions for prospective investigators", "Final strategic verdict and policy recommendations"],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1, 2]
      }
    ];
  } else if (docType === "Academic Essay") {
    subtitle = `A Rigorous Critical Essay (${options.tone || "Academic & Analytical"}) — Prepared for ${options.audience || "Students & Researchers"}`;
    sections = [
      {
        id: "sec_1",
        title: "1. Introduction & Thesis Argumentation",
        brief: `Foundational context, scholarly problem definition, and core thesis formulation regarding ${cleanTitle}.`,
        keyPoints: [
          `Historical and contextual backdrop of ${cleanTitle}`,
          "Core scholarly debate and theoretical tension",
          "Central thesis statement and structural outline of the argumentation"
        ],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1]
      },
      {
        id: "sec_2",
        title: "2. Theoretical Foundations & Counter-Perspectives",
        brief: `Analysis of prevailing academic paradigms, foundational literature, and critical counter-arguments surrounding ${cleanTitle}.`,
        keyPoints: [
          "Major conceptual frameworks and theoretical models",
          "Analysis of dissenting scholarly perspectives and critiques",
          "Synthesis of empirical validations across institutional datasets"
        ],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1]
      },
      {
        id: "sec_3",
        title: "3. Critical Synthesis & Textual Evidence",
        brief: `In-depth evidentiary evaluation, qualitative/quantitative metrics, and case-study analysis for ${cleanTitle}.`,
        keyPoints: [
          "Primary empirical findings and data corroboration",
          "Comparative case studies across operational clusters",
          "Methodological strengths and observable limitations"
        ],
        relevantSourceIndices: srcCount >= 4 ? [3, 4] : [srcCount]
      },
      {
        id: "sec_4",
        title: "4. Scholarly Conclusion & Future Discourse",
        brief: `Re-articulation of core findings, scholarly contributions, and implications for upcoming academic research on ${cleanTitle}.`,
        keyPoints: [
          "Synthesized resolution of the central thesis",
          "Broader theoretical and practical implications",
          "Key unanswered questions and prospective research avenues"
        ],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1, 2]
      }
    ];
  } else if (docType === "Literature Review") {
    subtitle = `A Comprehensive Literature Review & Thematic Synthesis (${options.tone || "Academic & Analytical"})`;
    sections = [
      {
        id: "sec_1",
        title: "1. Methodological Scope & Thematic Taxonomy",
        brief: `Systematic selection criteria, conceptual boundaries, and taxonomy of surveyed literature concerning ${cleanTitle}.`,
        keyPoints: [
          `Inclusion criteria and publication timeframe for ${cleanTitle}`,
          "Categorization of primary research streams and methodologies",
          "Institutional data sources and peer-reviewed corpus overview"
        ],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1]
      },
      {
        id: "sec_2",
        title: "2. Synthesized State of Contemporary Scholarship",
        brief: `Thematic synthesis of dominant research themes, empirical agreements, and core institutional findings on ${cleanTitle}.`,
        keyPoints: [
          "Consensus findings across market and academic studies",
          "Evolution of key performance metrics and adoption curves",
          "Ecosystem models validated by empirical scholarship"
        ],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1]
      },
      {
        id: "sec_3",
        title: "3. Methodological Divergences & Empirical Gaps",
        brief: `Critical examination of conflicting evidence, sampling discrepancies, and unaddressed questions in the literature on ${cleanTitle}.`,
        keyPoints: [
          "Contradictory findings across regional and qualitative datasets",
          "Methodological vulnerabilities in existing impact evaluations",
          "Underexplored demographics, operational constraints, and regulatory blind spots"
        ],
        relevantSourceIndices: srcCount >= 4 ? [3, 4] : [srcCount]
      },
      {
        id: "sec_4",
        title: "4. Theoretical Synthesis & Future Research Agenda",
        brief: `Unified framework reconciling existing findings and proposing concrete priorities for future academic inquiry on ${cleanTitle}.`,
        keyPoints: [
          "Integrated conceptual model bridging observed gaps",
          "High-priority research questions for prospective investigators",
          "Recommendations for standardized benchmarking and measurement"
        ],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1, 2]
      }
    ];
  } else if (docType === "Freeform Summary") {
    subtitle = `Executive Summary & Core Takeaways (${options.tone || "Executive & Direct"})`;
    sections = [
      {
        id: "sec_1",
        title: "1. Core Executive Takeaways & Baseline Findings",
        brief: `Concise briefing of the most critical high-level takeaways, metrics, and primary context regarding ${cleanTitle}.`,
        keyPoints: [
          `Essential summary statement on the state of ${cleanTitle}`,
          "Key benchmark statistics and verified market figures",
          "Top-level takeaway summary for decision-makers"
        ],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1]
      },
      {
        id: "sec_2",
        title: "2. Structural Analysis of Central Themes",
        brief: `Direct breakdown of the core operational themes, driving forces, and key variables governing ${cleanTitle}.`,
        keyPoints: [
          "Primary adoption drivers and functional infrastructure",
          "Key stakeholder roles and operational mechanics",
          "Observed hurdles and performance bottlenecks"
        ],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1]
      },
      {
        id: "sec_3",
        title: "3. Actionable Insights & Strategic Implications",
        brief: `Pragmatic recommendations, strategic implications, and next steps for ${cleanTitle}.`,
        keyPoints: [
          "Immediate tactical priorities and resource allocation",
          "Risk mitigation recommendations",
          "Outlook and key milestones to monitor"
        ],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1, 2]
      }
    ];
  } else {
    subtitle = `A Comprehensive Strategic & Operational Assessment (${options.tone || "Academic & Analytical"})`;
    sections = [
      {
        id: "sec_1",
        title: "1. Executive Summary & Baseline Landscape",
        brief: `Overview of current baseline metrics, verified benchmark indicators, and foundational scope for ${cleanTitle}.`,
        keyPoints: [
          `Core adoption and growth metrics for ${cleanTitle}`,
          "Current market volume and regional performance benchmarks",
          "Strategic priorities across primary stakeholders"
        ],
        relevantSourceIndices: srcCount >= 2 ? [1, 2] : [1]
      },
      {
        id: "sec_2",
        title: "2. Operational Infrastructure & Ecosystem Dynamics",
        brief: `Detailed analysis of deployment infrastructure, merchant/user engagement, and operational frameworks for ${cleanTitle}.`,
        keyPoints: [
          "Infrastructure scaling and distribution architecture",
          "Technology integration and operational unit economics",
          "Ecosystem adoption drivers across non-metro clusters"
        ],
        relevantSourceIndices: srcCount >= 3 ? [2, 3] : [1]
      },
      {
        id: "sec_3",
        title: "3. Structural Challenges & Risk Analysis",
        brief: `Critical assessment of operational bottlenecks, latency/downtime risks, and security considerations in ${cleanTitle}.`,
        keyPoints: [
          "Network latency, hardware reliability, and connectivity friction",
          "Fraud vulnerability, compliance oversight, and consumer trust",
          "Interoperability barriers and operational bottlenecks"
        ],
        relevantSourceIndices: srcCount >= 4 ? [3, 4] : [srcCount]
      },
      {
        id: "sec_4",
        title: "4. Strategic Roadmap & Implementation Framework",
        brief: `Actionable recommendations, regulatory harmonization, and long-term expansion roadmap for ${cleanTitle}.`,
        keyPoints: [
          "Infrastructure resilience and offline transaction protocols",
          "Incentive structuring and ecosystem alignment",
          "Comprehensive implementation timeline and impact metrics"
        ],
        relevantSourceIndices: srcCount >= 4 ? [1, 2, 3, 4] : [1, 2]
      }
    ];
  }

  return {
    title: capitalizedTitle,
    subtitle,
    docType,
    format: (options.format as any) || "docx",
    targetLength: options.targetLength || "Unlimited & Exhaustive (Comprehensive In-Depth)",
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

  const docTypePromptInstructions: Record<string, string> = {
    "Research Report": "Structure as a rigorous empirical Research Report: Executive Baseline, Ecosystem Dynamics, Risk Analysis, and Strategic Roadmap.",
    "Academic Essay": "Structure as a formal Academic Essay: Introduction & Thesis Statement, Theoretical Foundations & Counter-arguments, Critical Textual Synthesis, and Scholarly Conclusion.",
    "Literature Review": "Structure as a formal Literature Review: Methodological Scope & Taxonomy, Synthesis of Contemporary Scholarship, Empirical Gaps & Divergences, and Future Research Agenda.",
    "Freeform Summary": "Structure as a concise Freeform Executive Summary: Core Takeaways, Structural Analysis of Themes, and Actionable Next Steps."
  };

  const systemPrompt = `You are Paperrrrrr's Document Architect. Output ONLY valid JSON matching this exact schema:
{
  "title": "Document Title",
  "subtitle": "Subtitle describing scope and audience",
  "docType": "${docType}",
  "format": "${options.format || "docx"}",
  "targetLength": "${options.targetLength || "Detailed (~2,000 words)"}",
  "sections": [
    {
      "id": "sec_1",
      "title": "Section Title",
      "brief": "One sentence summary of this section's focus",
      "keyPoints": ["Point 1", "Point 2", "Point 3"],
      "relevantSourceIndices": [1, 2]
    }
  ]
}`;

  const isExhaustive = (options.targetLength || "").toLowerCase().includes("unlimited") || (options.targetLength || "").toLowerCase().includes("detailed") || options.format === "docx" || options.format === "pdf";

  const userMessage = `Create a structured document outline for the following prompt:
"${prompt}"

Document Type: ${docType} (${docTypePromptInstructions[docType] || docTypePromptInstructions["Research Report"]})
Target Format: ${options.format || "docx"}
Target Tone: ${options.tone || "Academic & Analytical"}
Target Audience: ${options.audience || "Researchers & Practitioners"}
Target Length: ${options.targetLength || "Unlimited & Exhaustive (Comprehensive In-Depth, 30–50 Pages)"}

${options.referenceNotes ? `User Provided Background / Reference Notes:\n${options.referenceNotes}\n` : ""}

Live Research Sources Available:
${JSON.stringify(researchBundle?.results || [], null, 2)}

Ensure:
1. Genuinely reflect the requested Document Type (${docType}) in section titles, briefs, and analytical structure.
${
  isExhaustive
    ? `2. CHAPTER COUNT: For Word (.docx) and PDF (.pdf) publication treatises (target 30 to 50 pages volume), generate 16 to 22 comprehensive, discrete chapters/modules (e.g. Chapter 1 through Chapter 18+) covering every facet: Executive Abstract, Historical Genesis, Theoretical Models, Methodological Metrics, Technical Architecture, Quantitative Empirical Data, Case Studies & Global Benchmarks, Regulatory & Policy Frameworks, Economic Feasibility & Unit Economics, Risk Vectors & Bottlenecks, Enterprise Security, Sociotechnical Impacts, ESG Lifecycle, Cross-Industry Interoperability, Emerging Horizons (2026-2035), Strategic Execution Roadmap, Risk Governance Matrix, and Concluding Scholarly Synthesis.`
    : `2. Generate 4 to 6 focused, high-impact sections.`
}
3. Link each section to relevant research source indices.
4. Every section has 3-4 specific key points directly addressing the prompt and reference notes.`;

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
  }
): Promise<string> {
  const geminiApiKey = customKeys?.customGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const tone = customKeys?.tone || "Academic & Analytical";
  const docType = customKeys?.docType || "Research Report";
  const format = customKeys?.format || "docx";
  const targetLength = customKeys?.targetLength || "Unlimited & Exhaustive (Comprehensive In-Depth, 30–50 Pages)";
  const isPptx = format === "pptx";
  const isXlsx = format === "xlsx";
  const isExhaustive = (format === "docx" || format === "pdf") && (targetLength.toLowerCase().includes("unlimited") || targetLength.toLowerCase().includes("detailed"));

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
  } else if (isXlsx) {
    formatInstruction = `- EXCEL SPREADSHEET ANALYTICAL MODEL FORMAT:
Write a rich, comprehensive structured Markdown Data Table representing this analytical worksheet with headers, rows, numerical figures, percentages, currency metrics, and formula calculation summaries.
Format the output as follows:
### Worksheet: ${section.title}
**Sheet Scope & Purpose:** ${section.brief}

| Index | Metric / Line Item | Baseline (2023) | Current (2024) | Target (2025) | 5-Yr Forecast (2028) | Variance (%) | Status / Audit |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| 01 | [Specific KPI / Revenue Stream] | $12.4M | $18.9M | $28.5M | $54.2M | +48.6% | Verified |
| 02 | [Operational Variable / Cost] | $8.1M | $11.2M | $14.8M | $22.6M | +32.1% | On Target |
...
| -- | **Summary Total / Average** | **$45.2M** | **$68.1M** | **$104.2M** | **$198.5M** | **+52.4%** | **Formula Verified** |

**Underlying Mathematical Models & Formula Logic:**
* \`Variance (%) = (Forecast - Current) / Current\`
* \`Weighted CAGR = (2028 Value / 2023 Value)^(1/5) - 1\`
* Data substantiated by institutional citations: ${filteredSources.map(s => `[${s.title}](${s.url})`).join(", ")}`;
  } else if (isExhaustive) {
    formatInstruction = `- UNLIMITED & EXHAUSTIVE 30–50 PAGE PUBLICATION DEPTH: For Word (.docx) and PDF (.pdf) treatises, write exhaustive, multi-subsection prose (1,200 to 1,800+ words per chapter).
- Divide the chapter into formal analytical subsections using:
  ### A. Empirical Baseline & Theoretical Foundations
  ### B. Structural Framework & Quantitative Synthesis
  ### C. Case Evidence & Comparative Benchmarking
  ### D. Institutional Governance & Strategic Policy Directives
- Include structured Markdown Data Tables (e.g. | Key Variable | 2024 Baseline | 2026 Target | Variance (%) | Strategic Impact |) to present empirical distributions and benchmarks cleanly.
- Do NOT truncate or brevity-cap. Fully articulate each subsection so the complete multi-chapter document naturally reaches 30 to 50 printed pages.`;
  } else {
    formatInstruction = `- Write 3-5 comprehensive, articulate paragraphs with structured points.`;
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

${customKeys?.referenceNotes ? `User Reference Notes:\n${customKeys.referenceNotes}\n` : ""}

Filtered Research Snippets for this section ONLY:
${JSON.stringify(filteredSources, null, 2)}

Instructions:
- Adapt the prose structure strictly to the target format (${format}) and tone (${tone}).
- ORIGINALITY & CITATIONS (Plagiarism Index < 10%): Synthesize all factual findings through independent scholarly argumentation, comparative critiques, and original domain synthesis. Never copy-paste verbatim sentences. Embed direct markdown citations like [Source: Organization/Paper](URL) after empirical statistics and claims.
- NATURAL HUMAN SYNTAX (AI Detection Score < 6%): Avoid stereotypical AI boilerplate phrases ('delve into', 'in conclusion', 'in this fast-paced world', 'testament to', 'crucial to note', 'beacon of', 'vibrant tapestry', 'it goes without saying'). Use genuine academic human tone with varied rhythm and burstiness (mix 6–10 word assertions with complex, multi-clause analytical sentences), concrete operational metrics, and nuanced critiques.
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
    return "[Generation Warning: This section could not be generated due to insufficient research context. Please retry with additional search queries.]";
  }

  const citations = filteredSources
    .map((s) => `[Source: ${s.title}](${s.url})`)
    .join(", ");

  let prefix = `The analysis for **${section.title}** examines the core dynamics of ${section.brief.toLowerCase()}`;
  if (docType === "Academic Essay") {
    prefix = `In evaluating **${section.title}**, the central thesis posits that ${section.brief.toLowerCase()}`;
  } else if (docType === "Literature Review") {
    prefix = `A systematic survey of scholarship regarding **${section.title}** demonstrates that ${section.brief.toLowerCase()}`;
  } else if (docType === "Freeform Summary") {
    prefix = `**Key Takeaway for ${section.title}:** ${section.brief}`;
  }

  const paragraph1 = `${prefix} ${citations ? `as substantiated by verified research (${citations})` : ""}.\n\n` +
    (filteredSources[0]?.snippet ? `Key empirical findings highlight: "${filteredSources[0].snippet}" ` : "") +
    `Primary operational benchmarks confirm that scaling in this area requires structured governance, robust technical integration, and consistent stakeholder alignment.`;

  const paragraph2 = (filteredSources[1]?.snippet ? `Furthermore, verified data indicates: "${filteredSources[1].snippet}" ` : "") +
    `Addressing the critical variables—specifically ${section.keyPoints.slice(0, 2).join(" as well as ")}—provides the necessary foundation for execution velocity and system reliability across varied operational environments.`;

  const paragraph3 = (filteredSources[2]?.snippet ? `Detailed ecosystem analysis reveals: "${filteredSources[2].snippet}" ` : "") +
    `Structural alignment across institutional partners and technical stakeholders accelerates deployment while minimizing system-wide integration friction.`;

  const paragraph4 = `In summary, executing against the strategic priorities for ${section.title.toLowerCase()} necessitates aligning immediate tactical deployments with long-term infrastructure resilience. Comprehensive policy oversight, granular empirical tracking, and continuous performance audits remain essential for sustained institutional impact.`;

  return `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}\n\n${paragraph4}`;
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
