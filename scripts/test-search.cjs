const { tavily } = require("@tavily/core");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

async function runSearch(queryPrompt) {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey || apiKey.trim() === "" || apiKey === "tvly-your_key_here") {
    console.error("\n⚠️  TAVILY_API_KEY is not set in `.env.local`!");
    console.log("Please add your key to `.env.local`: TAVILY_API_KEY=tvly-...\n");
    console.log("Here is the exact format of the raw sourced snippets bundle that PaperLoop generates:\n");
    
    const sampleOutput = {
      query: queryPrompt,
      answer: `Renewable energy adoption in India has grown rapidly, driven by ambitious target of 500 GW non-fossil capacity by 2030. Solar and wind power lead the transition, supported by policies like PM-KUSUM and National Green Hydrogen Mission.`,
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
    
    console.log(JSON.stringify(sampleOutput, null, 2));
    return;
  }

  const tvly = tavily({ apiKey });

  console.log(`\n==================================================`);
  console.log(`🔍 RUNNING LIVE TAVILY SEARCH FOR PROMPT:`);
  console.log(`"${queryPrompt}"`);
  console.log(`==================================================\n`);

  try {
    const response = await tvly.search(queryPrompt, {
      searchDepth: "advanced",
      includeAnswer: true,
      maxResults: 6,
      topic: "general"
    });

    console.log(`\n--- TAVILY DIRECT SYNTHESIZED ANSWER ---`);
    console.log(response.answer || "No direct answer generated.");

    console.log(`\n--- SOURCED SEARCH SNIPPETS (${response.results?.length || 0} results) ---`);
    
    const resultsSummary = (response.results || []).map((res, idx) => ({
      index: idx + 1,
      title: res.title,
      url: res.url,
      score: res.score,
      snippet: res.content
    }));

    resultsSummary.forEach((item) => {
      console.log(`\n[Source #${item.index}]`);
      console.log(`Title: ${item.title}`);
      console.log(`URL: ${item.url}`);
      console.log(`Relevance Score: ${item.score}`);
      console.log(`Snippet: ${item.snippet}`);
      console.log(`--------------------------------------------------`);
    });

    console.log("\n--- RAW JSON RESEARCH BUNDLE OUTPUT ---");
    console.log(JSON.stringify({
      query: queryPrompt,
      answer: response.answer,
      results: resultsSummary
    }, null, 2));

  } catch (error) {
    console.error("Search failed:", error.message || error);
  }
}

const promptArg = process.argv.slice(2).join(" ") || "a report on renewable energy adoption in India";
runSearch(promptArg);
