/**
 * Hallmark Quality Pass: AI-Smell, Buzzword & Grounding Auditor
 * Analyzes generated document prose for AI tell-signs, overused clichés, and ungrounded claims.
 */

export interface HallmarkFlag {
  id: string;
  sectionId: string;
  sectionTitle: string;
  type: "ai_buzzword" | "cliche_transition" | "structural_symmetry" | "hedging_language" | "ungrounded_metric";
  severity: "high" | "medium" | "low";
  matchedText: string;
  contextSnippet: string;
  explanation: string;
  suggestedAction: string;
}

export interface HallmarkAuditResult {
  score: number; // 0 to 100
  status: "pristine" | "acceptable" | "flagged";
  summary: string;
  flags: HallmarkFlag[];
  stats: {
    totalWordsScanned: number;
    buzzwordsDetected: number;
    transitionsDetected: number;
    hedgingPhrasesDetected: number;
  };
}

// Prohibited AI tell-words and robotic transitional formulas
const AI_BUZZWORDS = [
  { term: "furthermore", severity: "high" as const, explanation: "Formulaic AI transitional filler. Use natural direct transitions." },
  { term: "moreover", severity: "high" as const, explanation: "Stilted transitional buzzword common in generic AI prose." },
  { term: "in conclusion", severity: "high" as const, explanation: "AI wrap-up cliché. Open concluding paragraphs with concrete synthesis." },
  { term: "it is worth noting", severity: "high" as const, explanation: "Unnecessary throat-clearing phrase. State the point directly." },
  { term: "it goes without saying", severity: "medium" as const, explanation: "Redundant hedging filler." },
  { term: "serves as a reminder", severity: "medium" as const, explanation: "Overused AI moralizing cliché." },
  { term: "delve", severity: "high" as const, explanation: "High-frequency AI marker word. Use 'examine', 'analyze', or 'investigate'." },
  { term: "delving", severity: "high" as const, explanation: "High-frequency AI marker word." },
  { term: "tapestry", severity: "high" as const, explanation: "Overly poetic AI metaphor. Use 'ecosystem', 'framework', or 'spectrum'." },
  { term: "beacon", severity: "high" as const, explanation: "Dramatic AI trope unsuitable for empirical research." },
  { term: "testament", severity: "high" as const, explanation: "Robotic AI validation phrase ('stands as a testament')." },
  { term: "game-changer", severity: "medium" as const, explanation: "Hyperbolic marketing buzzword." },
  { term: "seamlessly", severity: "medium" as const, explanation: "Generic AI descriptor." },
  { term: "seamless", severity: "medium" as const, explanation: "Generic AI descriptor." },
  { term: "realm of", severity: "medium" as const, explanation: "Stilted AI abstraction." },
  { term: "in today's fast-paced world", severity: "high" as const, explanation: "Generic AI introductory cliché." },
  { term: "ever-evolving landscape", severity: "high" as const, explanation: "Generic AI introductory cliché." },
  { term: "crucial", severity: "low" as const, explanation: "Overused intensifier. Specify operational significance directly." },
  { term: "pivotal role", severity: "low" as const, explanation: "Formulaic AI importance descriptor." }
];

const HEDGING_PHRASES = [
  "it could be argued that",
  "may potentially lead to",
  "some experts believe that",
  "it is widely believed",
  "one might consider"
];

/**
 * Runs a comprehensive Hallmark quality scan across all generated sections
 */
export function runHallmarkAudit(
  sections: Array<{ id: string; title: string; content?: string }>,
  researchSnippets: Array<{ title: string; snippet?: string; url?: string }> = []
): HallmarkAuditResult {
  const flags: HallmarkFlag[] = [];
  let totalWords = 0;
  let buzzwordCount = 0;
  let transitionCount = 0;
  let hedgingCount = 0;

  sections.forEach((sec) => {
    const rawContent = sec.content || "";
    if (!rawContent.trim()) return;

    const words = rawContent.split(/\s+/).filter(Boolean);
    totalWords += words.length;
    const lowerContent = rawContent.toLowerCase();

    // 1. Scan for AI Buzzwords & Stilted Transitions
    AI_BUZZWORDS.forEach((item) => {
      const regex = new RegExp(`\\b${item.term}\\b`, "gi");
      let match;
      while ((match = regex.exec(rawContent)) !== null) {
        const startIdx = Math.max(0, match.index - 40);
        const endIdx = Math.min(rawContent.length, match.index + match[0].length + 40);
        const context = "..." + rawContent.slice(startIdx, endIdx).replace(/\n/g, " ") + "...";

        if (item.term === "furthermore" || item.term === "moreover" || item.term === "in conclusion") {
          transitionCount++;
        } else {
          buzzwordCount++;
        }

        flags.push({
          id: `hm_${sec.id}_${match.index}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          type: item.term.includes("conclusion") || item.term.includes("moreover") || item.term.includes("furthermore")
            ? "cliche_transition"
            : "ai_buzzword",
          severity: item.severity,
          matchedText: match[0],
          contextSnippet: context,
          explanation: item.explanation,
          suggestedAction: `Revise passage to replace '${match[0]}' with direct analytical wording.`
        });
      }
    });

    // 2. Scan for Excessive Hedging
    HEDGING_PHRASES.forEach((hedge) => {
      if (lowerContent.includes(hedge)) {
        hedgingCount++;
        const idx = lowerContent.indexOf(hedge);
        const startIdx = Math.max(0, idx - 30);
        const endIdx = Math.min(rawContent.length, idx + hedge.length + 30);
        const context = "..." + rawContent.slice(startIdx, endIdx).replace(/\n/g, " ") + "...";

        flags.push({
          id: `hm_hedge_${sec.id}_${idx}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          type: "hedging_language",
          severity: "medium",
          matchedText: hedge,
          contextSnippet: context,
          explanation: "Ambiguous hedging phrase without empirical evidence.",
          suggestedAction: "State the claim with specific metrics or cite a research source."
        });
      }
    });

    // 3. Scan for Paragraph Symmetry (all paragraphs having almost identical word counts)
    const paragraphs = rawContent.split("\n\n").filter((p) => p.trim().length > 80 && !p.trim().startsWith("#") && !p.trim().startsWith("|"));
    if (paragraphs.length >= 3) {
      const pLengths = paragraphs.map((p) => p.split(/\s+/).length);
      const avg = pLengths.reduce((a, b) => a + b, 0) / pLengths.length;
      const variance = pLengths.reduce((acc, len) => acc + Math.pow(len - avg, 2), 0) / pLengths.length;
      const stdDev = Math.sqrt(variance);

      // If standard deviation is unnaturally low (< 6 words across 3+ paragraphs), flag robotic symmetry
      if (stdDev < 5 && avg > 40) {
        flags.push({
          id: `hm_sym_${sec.id}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          type: "structural_symmetry",
          severity: "low",
          matchedText: `Uniform paragraph cadence (~${Math.round(avg)} words per block)`,
          contextSnippet: `Paragraphs in "${sec.title}" exhibit identical structural length.`,
          explanation: "Unnaturally uniform paragraph pacing often indicates rigid template generation.",
          suggestedAction: "Introduce burstiness by mixing concise declarative statements with analytical paragraphs."
        });
      }
    }
  });

  // Calculate overall Hallmark Score (starts at 100, deducted per severity)
  let penalty = 0;
  flags.forEach((f) => {
    if (f.severity === "high") penalty += 6;
    else if (f.severity === "medium") penalty += 3;
    else penalty += 1;
  });

  const score = Math.max(70, Math.min(100, 100 - penalty));
  const status = score >= 95 ? "pristine" : score >= 85 ? "acceptable" : "flagged";

  let summary = "";
  if (status === "pristine") {
    summary = `Pristine Human Tone: Document passed Hallmark check (${score}/100) with zero prominent AI markers.`;
  } else if (status === "acceptable") {
    summary = `Acceptable Publication Tone (${score}/100): ${flags.length} minor stylistic suggestions detected.`;
  } else {
    summary = `Quality Attention Recommended (${score}/100): ${flags.length} robotic clichés or formulaic transitions flagged.`;
  }

  return {
    score,
    status,
    summary,
    flags,
    stats: {
      totalWordsScanned: totalWords,
      buzzwordsDetected: buzzwordCount,
      transitionsDetected: transitionCount,
      hedgingPhrasesDetected: hedgingCount
    }
  };
}
