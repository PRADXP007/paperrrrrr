const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/genai");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

// Sample research bundle if no file/arg passed
const defaultResearchBundle = {
  query: "a report on renewable energy adoption in India",
  answer: "Renewable energy adoption in India has grown rapidly, driven by ambitious target of 500 GW non-fossil capacity by 2030. Solar and wind power lead the transition, supported by policies like PM-KUSUM and National Green Hydrogen Mission.",
  results: [
    {
      index: 1,
      title: "India Renewable Energy Development & Targets - Ministry of New and Renewable Energy",
      url: "https://mnre.gov.in/overview/",
      score: 0.98,
      snippet: "India stands 4th globally in renewable energy installed capacity. Solar power capacity reached 70+ GW while wind installed capacity surpassed 44 GW. Key initiatives include Production Linked Incentive (PLI) scheme for high efficiency solar PV modules."
    },
    {
      index: 2,
      title: "Renewable Energy Market in India Report 2026 - IEA Analysis",
      url: "https://www.iea.org/reports/india-energy-outlook",
      score: 0.94,
      snippet: "India is on track to meet 50% of its electricity requirements from renewable energy sources by 2030. Challenges include grid integration, battery storage economics, and discom financial health."
    },
    {
      index: 3,
      title: "Green Hydrogen and Solar Power Expansion Trends in India",
      url: "https://pib.gov.in/PressReleasePage.aspx?PRID=1980000",
      score: 0.89,
      snippet: "National Green Hydrogen Mission aims to develop green hydrogen production capacity of at least 5 MMT per annum with an associated renewable energy capacity addition of about 125 GW by 2030."
    }
  ]
};

async function generateOutline(userPrompt, options = {}, researchBundle = defaultResearchBundle) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

  console.log(`\n==================================================`);
  console.log(`📋 STAGE 2: GENERATING STRUCTURED OUTLINE (JSON)`);
  console.log(`Prompt: "${userPrompt}"`);
  console.log(`Format: ${options.format || "docx"} | Tone: ${options.tone || "Academic"} | Audience: ${options.audience || "General"}`);
  console.log(`Research sources attached: ${researchBundle.results?.length || 0}`);
  console.log(`==================================================\n`);

  if (apiKey && process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const systemPrompt = `You are a professional document architect for Paperrrrrr. 
Given a user prompt, desired metadata, and a research bundle with numbered sources, create a detailed structured JSON outline.
Every section MUST have:
- "id": string (sec_1, sec_2...)
- "title": concise, professional heading title
- "brief": one line summary explaining what this section will focus on
- "keyPoints": array of 2-4 key bullet points to cover
- "relevantSourceIndices": array of source index numbers (e.g. [1, 2]) matching the research bundle that are relevant for this specific section.

Return ONLY valid JSON matching this schema:
{
  "title": string,
  "subtitle": string,
  "docType": string,
  "format": string,
  "targetLength": string,
  "sections": [
    {
      "id": string,
      "title": string,
      "brief": string,
      "keyPoints": [string],
      "relevantSourceIndices": [number]
    }
  ]
}`;

      const userMessage = `User Prompt: ${userPrompt}
Target Format: ${options.format || "docx"}
Target Tone: ${options.tone || "Academic & Analytical"}
Target Audience: ${options.audience || "Students & Researchers"}

Research Bundle:
${JSON.stringify(researchBundle, null, 2)}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" }
      });

      const jsonResult = JSON.parse(completion.choices[0].message.content);
      displayAndSaveOutline(jsonResult);
      return jsonResult;
    } catch (err) {
      console.warn("OpenAI API call failed, using fallback outline generator:", err.message);
    }
  }

  // Standalone Deterministic Generator Fallback (Ensures script runs standalone out-of-the-box)
  const fallbackOutline = {
    title: "Renewable Energy Adoption in India: Current Landscape, Policy Drivers, and Future Trajectory",
    subtitle: "A Comprehensive Analysis of Solar, Wind, and Green Hydrogen Integration by 2030",
    docType: options.docType || "Research Report",
    format: options.format || "docx",
    targetLength: "Detailed (~2,500 words)",
    sections: [
      {
        id: "sec_1",
        title: "Executive Summary & Current Renewable Energy Baseline",
        brief: "Overview of India's 4th global ranking in installed capacity, key figures (70+ GW solar, 44+ GW wind), and primary policy commitments.",
        keyPoints: [
          "Current installed non-fossil capacity status",
          "Target of 500 GW by 2030",
          "Key ministry benchmarks and achievements"
        ],
        relevantSourceIndices: [1, 2]
      },
      {
        id: "sec_2",
        title: "Policy Frameworks: PLI Schemes and PM-KUSUM",
        brief: "Analysis of government incentives encouraging domestic solar PV manufacturing and agricultural solarization.",
        keyPoints: [
          "Production Linked Incentive (PLI) scheme mechanics",
          "PM-KUSUM program implementation and rural impact",
          "Regulatory support and tariff structures"
        ],
        relevantSourceIndices: [1]
      },
      {
        id: "sec_3",
        title: "Emerging Vectors: National Green Hydrogen Mission",
        brief: "Evaluation of the 5 MMT annual green hydrogen production target and associated 125 GW capacity requirement.",
        keyPoints: [
          "Industrial decarbonization roadmap",
          "Associated renewable capacity expansion",
          "Investment requirements and export potential"
        ],
        relevantSourceIndices: [3]
      },
      {
        id: "sec_4",
        title: "Grid Integration, Battery Storage & Economic Challenges",
        brief: "Critical examination of grid stability, battery energy storage system (BESS) costs, and discom financial health.",
        keyPoints: [
          "Intermittent power management and grid infrastructure",
          "Battery storage economics and supply chain dependencies",
          "Discom power purchase agreements and liquidity issues"
        ],
        relevantSourceIndices: [2]
      },
      {
        id: "sec_5",
        title: "Strategic Roadmap towards 2030 & Key Recommendations",
        brief: "Actionable policy and technical recommendations to achieve 50% electricity generation from non-fossil sources.",
        keyPoints: [
          "Accelerating BESS deployment and pumped hydro storage",
          "Discom financial restructuring priorities",
          "Public-private investment partnerships"
        ],
        relevantSourceIndices: [1, 2, 3]
      }
    ]
  };

  displayAndSaveOutline(fallbackOutline);
  return fallbackOutline;
}

function displayAndSaveOutline(outline) {
  console.log("--- GENERATED STRUCTURED JSON OUTLINE ---");
  console.log(JSON.stringify(outline, null, 2));

  const outputPath = path.join(__dirname, "sample-outline.json");
  fs.writeFileSync(outputPath, JSON.stringify(outline, null, 2));
  console.log(`\n✅ Saved structured outline to: ${outputPath}`);
}

const promptArg = process.argv.slice(2).join(" ") || "a report on renewable energy adoption in India";
generateOutline(promptArg);
