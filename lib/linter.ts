/**
 * Mechanical Linting Pass: Grammar, Punctuation & Formatting Engine
 * Scans generated document prose for mechanical anomalies and provides 1-click automated repairs.
 */

export interface LintIssue {
  id: string;
  sectionId: string;
  sectionTitle: string;
  type: "punctuation" | "spacing" | "heading_capitalization" | "number_formatting" | "unmatched_symbols";
  severity: "error" | "warning" | "style";
  problemText: string;
  contextSnippet: string;
  description: string;
  proposedFix: string;
}

export interface LintReport {
  issueCount: number;
  errorCount: number;
  warningCount: number;
  issues: LintIssue[];
  isClean: boolean;
  summary: string;
}

/**
 * Scans document sections for mechanical and formatting anomalies
 */
export function runMechanicalLint(
  sections: Array<{ id: string; title: string; content?: string }>
): LintReport {
  const issues: LintIssue[] = [];
  let errorCount = 0;
  let warningCount = 0;

  sections.forEach((sec) => {
    const rawContent = sec.content || "";
    if (!rawContent.trim()) return;

    const lines = rawContent.split("\n");

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // 1. Check for Stray Double Spaces
      if (line.includes("  ") && !line.startsWith("    ") && !line.startsWith("|")) {
        issues.push({
          id: `lint_space_${sec.id}_${lineIdx}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          type: "spacing",
          severity: "style",
          problemText: "Stray multiple consecutive spaces",
          contextSnippet: line.slice(0, 60),
          description: "Multiple consecutive spaces detected between words.",
          proposedFix: line.replace(/[ \t]{2,}/g, " ")
        });
      }

      // 2. Check for Space Before Punctuation (e.g., "word , " or "word . ")
      const spacePunctMatch = line.match(/\s+([,\.!?;:])/);
      if (spacePunctMatch && !line.includes("http")) {
        issues.push({
          id: `lint_punct_${sec.id}_${lineIdx}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          type: "punctuation",
          severity: "warning",
          problemText: spacePunctMatch[0],
          contextSnippet: line.slice(0, 60),
          description: `Extraneous whitespace preceding punctuation '${spacePunctMatch[1]}'.`,
          proposedFix: line.replace(/\s+([,\.!?;:])/g, "$1")
        });
        warningCount++;
      }

      // 3. Check for Unmatched Parentheses or Brackets
      const openParen = (line.match(/\(/g) || []).length;
      const closeParen = (line.match(/\)/g) || []).length;
      if (openParen !== closeParen && !line.startsWith("|") && !line.includes("$$")) {
        issues.push({
          id: `lint_paren_${sec.id}_${lineIdx}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          type: "unmatched_symbols",
          severity: "warning",
          problemText: `Mismatched parentheses: ${openParen} open vs ${closeParen} closed`,
          contextSnippet: line.slice(0, 70),
          description: "Unclosed or mismatched opening/closing parentheses.",
          proposedFix: "Review parenthetical clause to ensure complete closure."
        });
        warningCount++;
      }

      // 4. Check for Unmatched Square Brackets (Citations)
      const openBracket = (line.match(/\[/g) || []).length;
      const closeBracket = (line.match(/\]/g) || []).length;
      if (openBracket !== closeBracket && !line.startsWith("|")) {
        issues.push({
          id: `lint_bracket_${sec.id}_${lineIdx}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          type: "unmatched_symbols",
          severity: "error",
          problemText: `Mismatched citation brackets: ${openBracket} open vs ${closeBracket} closed`,
          contextSnippet: line.slice(0, 70),
          description: "Malformed citation bracket syntax in markdown.",
          proposedFix: "Verify bracket closure on citation tag [1] or markdown link."
        });
        errorCount++;
      }

      // 5. Check for Missing End Punctuation on Paragraph Blocks
      if (
        trimmed.length > 80 &&
        !trimmed.startsWith("#") &&
        !trimmed.startsWith("|") &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("*") &&
        !/[.!?"':]$/.test(trimmed)
      ) {
        issues.push({
          id: `lint_endpunct_${sec.id}_${lineIdx}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          type: "punctuation",
          severity: "warning",
          problemText: "Paragraph missing terminating punctuation",
          contextSnippet: line.slice(-50),
          description: "Terminal paragraph sentence lacks terminating period or punctuation.",
          proposedFix: trimmed + "."
        });
        warningCount++;
      }
    });

    // 6. Check for Heading Capitalization in Subsection Headers
    const headingLines = rawContent.split("\n").filter((l) => l.trim().startsWith("### "));
    headingLines.forEach((hLine, hIdx) => {
      const hText = hLine.replace(/^###\s+/, "").replace(/^\d+(\.\d+)*\s*/, "").trim();
      const words = hText.split(/\s+/);
      const isAllLower = words.length > 2 && words.every((w) => w === w.toLowerCase() && w.length > 3);
      if (isAllLower) {
        issues.push({
          id: `lint_headcap_${sec.id}_${hIdx}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          type: "heading_capitalization",
          severity: "style",
          problemText: hText,
          contextSnippet: hLine,
          description: "Heading appears in all-lowercase instead of standard Title Case.",
          proposedFix: hText.replace(/\b\w/g, (c) => c.toUpperCase())
        });
      }
    });
  });

  const issueCount = issues.length;
  const isClean = issueCount === 0;

  let summary = "";
  if (isClean) {
    summary = "Mechanical Linting Clean: All punctuation, spacing, bracket pairs, and headings are properly formatted.";
  } else {
    summary = `${issueCount} mechanical items identified (${errorCount} syntax errors, ${warningCount} warnings).`;
  }

  return {
    issueCount,
    errorCount,
    warningCount,
    issues,
    isClean,
    summary
  };
}

/**
 * One-Click Automated Mechanical Fixer
 * Applies deterministic text repairs across all sections without altering analytical prose.
 */
export function autoFixMechanicalIssues(
  sections: Array<{ id: string; title: string; content?: string }>
): {
  fixedSections: Array<{ id: string; title: string; content: string }>;
  fixesAppliedCount: number;
} {
  let fixesCount = 0;

  const fixedSections = sections.map((sec) => {
    let content = sec.content || "";
    if (!content.trim()) return { ...sec, content };

    // 1. Fix double spaces (except code / tables)
    const lines = content.split("\n");
    const cleanedLines = lines.map((line) => {
      let l = line;
      if (!l.startsWith("    ") && !l.startsWith("|")) {
        const spaceCleaned = l.replace(/[ \t]{2,}/g, " ");
        if (spaceCleaned !== l) {
          fixesCount++;
          l = spaceCleaned;
        }
      }

      // 2. Fix space before punctuation (e.g. "word ." -> "word.")
      const punctCleaned = l.replace(/\s+([,\.!?;:])/g, "$1");
      if (punctCleaned !== l) {
        fixesCount++;
        l = punctCleaned;
      }

      // 3. Fix missing terminal period on long prose paragraphs
      const trimmed = l.trim();
      if (
        trimmed.length > 80 &&
        !trimmed.startsWith("#") &&
        !trimmed.startsWith("|") &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("*") &&
        !/[.!?"':]$/.test(trimmed)
      ) {
        fixesCount++;
        l = l + ".";
      }

      return l;
    });

    return {
      ...sec,
      content: cleanedLines.join("\n")
    };
  });

  return {
    fixedSections,
    fixesAppliedCount: fixesCount
  };
}
