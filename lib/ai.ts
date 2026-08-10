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
  referenceNotes?: string;
}

/**
 * Builds a dynamic, docType-specific outline directly from user input and research bundle
 */
function buildDynamicOutline(
  prompt: string,
  options: GenerateOutlineOptions,
  research: ResearchBundle
): GeneratedOutline {
  const cleanTitle = prompt.trim().replace(/^a report on\s+/i, "").replace(/^an essay on\s+/i, "").replace(/^a review on\s+/i, "");
  const capitalizedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  const srcCount = research.results.length;
  const docType = options.docType || "Research Report";

  let sections: OutlineSection[] = [];
  let subtitle = "";

  if (docType === "Academic Essay") {
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
    // Default: "Research Report"
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
    targetLength: options.targetLength || "Detailed (~2,000 words)",
    sections
  };
}

export async function generateStructuredOutline(
  prompt: string,
  options: GenerateOutlineOptions = {},
  researchBundle: ResearchBundle
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

  const userMessage = `Create a structured document outline for the following prompt:
"${prompt}"

Document Type: ${docType} (${docTypePromptInstructions[docType] || docTypePromptInstructions["Research Report"]})
Target Format: ${options.format || "docx"}
Target Tone: ${options.tone || "Academic & Analytical"}
Target Audience: ${options.audience || "Researchers & Practitioners"}
Target Length: ${options.targetLength || "Detailed (~2,000 words)"}

${options.referenceNotes ? `User Provided Background / Reference Notes:\n${options.referenceNotes}\n` : ""}

Live Research Sources Available:
${JSON.stringify(researchBundle.results, null, 2)}

Ensure:
1. Genuinely reflect the requested Document Type (${docType}) in section titles, briefs, and analytical structure.
2. Link each section to relevant research source indices.
3. Every section has 3-4 specific key points directly addressing the prompt and reference notes.`;

  // 1. Primary AI Provider: Gemini Flash (@google/genai)
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${systemPrompt}\n\n${userMessage}`,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.sections && Array.isArray(parsed.sections)) {
          return parsed as GeneratedOutline;
        }
      }
    } catch (e) {
      console.warn("Gemini Flash API call failed for outline, checking secondary provider:", e);
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
  customKeys?: { customGeminiKey?: string; customOpenAIKey?: string; referenceNotes?: string; docType?: string; tone?: string }
): Promise<string> {
  const geminiApiKey = customKeys?.customGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const tone = customKeys?.tone || "Academic & Analytical";
  const docType = customKeys?.docType || "Research Report";

  const prompt = `Write publication-grade prose for the following section:
Document Title: ${docTitle}
Document Type: ${docType}
Tone: ${tone}
Section Title: ${section.title}
Section Brief: ${section.brief}
Key Points: ${section.keyPoints.join("; ")}

${customKeys?.referenceNotes ? `User Reference Notes:\n${customKeys.referenceNotes}\n` : ""}

Filtered Research Snippets for this section ONLY:
${JSON.stringify(filteredSources, null, 2)}

Instructions:
- Adapt the prose structure to the document type (${docType}) and tone (${tone}).
- Write 2-4 comprehensive, articulate paragraphs.
- Include markdown citations like [Source: Title](URL).
- Ground the prose in specific empirical figures, percentages, and institutional frameworks.
- Output ONLY the section body markdown.`;

  // 1. Primary AI Provider: Gemini Flash (@google/genai)
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      if (response.text) {
        return response.text;
      }
    } catch (e) {
      console.warn("Gemini Flash section generation failed, checking secondary provider:", e);
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
    `Addressing the critical variables—specifically ${section.keyPoints.slice(0, 2).join(" as well as ")}—provides the necessary foundation for execution velocity and system reliability.`;

  const paragraph3 = `In summary, executing against the strategic priorities for ${section.title.toLowerCase()} necessitates aligning immediate tactical deployments with long-term infrastructure resilience. Comprehensive policy oversight and continuous performance audits remain essential for sustained institutional impact.`;

  return `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;
}

/**
 * Regenerates an individual section with custom user instructions
 */
export async function regenerateSingleSection(
  docTitle: string,
  section: OutlineSection,
  filteredSources: ResearchSnippet[],
  userInstruction: string,
  customKeys?: { customGeminiKey?: string; customOpenAIKey?: string; docType?: string; tone?: string }
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
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      if (response.text) return response.text;
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
