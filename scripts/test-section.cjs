const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

// Load outline from Stage 2 or fallback
let sampleOutline;
try {
  sampleOutline = JSON.parse(fs.readFileSync(path.join(__dirname, "sample-outline.json"), "utf8"));
} catch (e) {
  sampleOutline = {
    title: "Renewable Energy Adoption in India",
    sections: [
      {
        id: "sec_1",
        title: "Executive Summary & Current Renewable Energy Baseline",
        brief: "Overview of India's 4th global ranking in installed capacity, key figures (70+ GW solar, 44+ GW wind), and primary policy commitments.",
        keyPoints: ["Current installed capacity", "500 GW by 2030 target", "Ministry benchmarks"],
        relevantSourceIndices: [1, 2]
      }
    ]
  };
}

// Sample research bundle
const sampleResearchBundle = {
  results: [
    {
      index: 1,
      title: "India Renewable Energy Development & Targets - MNRE",
      url: "https://mnre.gov.in/overview/",
      snippet: "India stands 4th globally in renewable energy installed capacity. Solar power capacity reached 70+ GW while wind installed capacity surpassed 44 GW. Key initiatives include Production Linked Incentive (PLI) scheme for high efficiency solar PV modules."
    },
    {
      index: 2,
      title: "Renewable Energy Market in India Report 2026 - IEA Analysis",
      url: "https://www.iea.org/reports/india-energy-outlook",
      snippet: "India is on track to meet 50% of its electricity requirements from renewable energy sources by 2030. Challenges include grid integration, battery storage economics, and discom financial health."
    },
    {
      index: 3,
      title: "Green Hydrogen and Solar Power Expansion Trends in India",
      url: "https://pib.gov.in/PressReleasePage.aspx?PRID=1980000",
      snippet: "National Green Hydrogen Mission aims to develop green hydrogen production capacity of at least 5 MMT per annum with an associated renewable energy capacity addition of about 125 GW by 2030."
    }
  ]
};

async function generateSingleSection(sectionIndex = 0) {
  const section = sampleOutline.sections[sectionIndex] || sampleOutline.sections[0];
  
  // FILTERING STEP: Filter research bundle to pass ONLY sources relevant to THIS specific section!
  const filteredSources = sampleResearchBundle.results.filter(src => 
    section.relevantSourceIndices.includes(src.index)
  );

  console.log(`\n==================================================`);
  console.log(`✍️ STAGE 3: GENERATING SECTION ${sectionIndex + 1} OF ${sampleOutline.sections.length}`);
  console.log(`Section Title: "${section.title}"`);
  console.log(`Section Brief: "${section.brief}"`);
  console.log(`Filtered Research Sources Passed: ${filteredSources.length} (Source Indices: [${section.relevantSourceIndices.join(", ")}])`);
  console.log(`==================================================\n`);

  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const prompt = `Write a comprehensive, publication-grade report section for:
Document Title: ${sampleOutline.title}
Section Title: ${section.title}
Section Brief: ${section.brief}
Key Points to cover: ${section.keyPoints.join("; ")}

Filtered Research Snippets for this section ONLY:
${JSON.stringify(filteredSources, null, 2)}

Instructions:
- Write detailed, highly structured paragraphs.
- Incorporate inline markdown citations like [Source: Title](URL).
- Do NOT output preamble, start directly with the section body prose.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const sectionContent = completion.choices[0].message.content;
      displayAndSaveSection(section, sectionContent);
      return sectionContent;
    } catch (err) {
      console.warn("OpenAI API call failed, using deterministic section generator:", err.message);
    }
  }

  // Standalone Deterministic Content Generator Fallback
  let sectionContent = "";
  if (section.id === "sec_1") {
    sectionContent = `India has emerged as one of the fastest-growing renewable energy markets globally, currently holding the 4th position worldwide in total installed renewable capacity. As of recent ministry updates, the nation's solar power infrastructure has scaled beyond 70 GW, while onshore wind installed capacity has surpassed 44 GW [Source: Ministry of New and Renewable Energy](https://mnre.gov.in/overview/).

This rapid acceleration forms part of a broader geopolitical and environmental commitment to achieve 500 GW of non-fossil fuel power capacity by 2030, fulfilling half of the national electricity demand through clean energy sources [Source: IEA Analysis](https://www.iea.org/reports/india-energy-outlook). Strategic interventions such as the Production Linked Incentive (PLI) scheme for high-efficiency solar photovoltaic modules have significantly reduced reliance on imported equipment, establishing domestic supply chains and underpinning long-term energy independence.`;
  } else if (section.id === "sec_2") {
    sectionContent = `The policy architecture governing India's green energy transition is built around targeted economic incentives and decentralized rural deployment. A major catalyst is the Production Linked Incentive (PLI) scheme, designed to stimulate gigawatt-scale domestic manufacturing of high-efficiency solar cells and modules [Source: Ministry of New and Renewable Energy](https://mnre.gov.in/overview/).

Concurrently, the PM-KUSUM (Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan) initiative focuses on solarizing agricultural pumps and decentralized solar plants in rural feeder systems. By decoupling agricultural electricity subsidies from state power distribution companies (discoms), PM-KUSUM enhances farmers' financial stability while injecting clean power directly into local feeder networks.`;
  } else {
    sectionContent = `As India advances toward its 2030 targets, the National Green Hydrogen Mission represents a decisive step toward industrial decarbonization. The program targets the production of at least 5 million metric tonnes (MMT) of green hydrogen per annum by 2030, requiring an incremental 125 GW of dedicated renewable generation capacity [Source: PIB India](https://pib.gov.in/PressReleasePage.aspx?PRID=1980000).

Achieving these milestones demands addressing critical grid integration bottlenecks, scaling battery energy storage systems (BESS), and resolving state discom financial liquidity challenges [Source: IEA Analysis](https://www.iea.org/reports/india-energy-outlook).`;
  }

  displayAndSaveSection(section, sectionContent);
  return sectionContent;
}

function displayAndSaveSection(section, content) {
  console.log(`--- GENERATED SECTION PROSE FOR: "${section.title}" ---\n`);
  console.log(content);

  const outputPath = path.join(__dirname, `sample-section-${section.id}.md`);
  fs.writeFileSync(outputPath, `# ${section.title}\n\n${content}`);
  console.log(`\n✅ Saved section file to: ${outputPath}`);
}

const sectionIdx = parseInt(process.argv[2] || "0", 10);
generateSingleSection(sectionIdx);
