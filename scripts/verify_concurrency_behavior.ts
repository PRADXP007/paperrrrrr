import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { generateSectionProse } from "../lib/ai";
import { executeTavilyResearch } from "../lib/tavily";

async function verifySectionConcurrency() {
  console.log("================================================================================");
  console.log("🔍 DIRECT CONCURRENCY & DISPATCH VERIFICATION");
  console.log("================================================================================\n");

  const testSections = [
    { id: "sec_1", title: "1. Executive Summary", brief: "Core overview", keyPoints: ["Point 1"] },
    { id: "sec_2", title: "2. Technical Architecture", brief: "System components", keyPoints: ["Point 2"] },
    { id: "sec_3", title: "3. Empirical Benchmarks", brief: "Performance metrics", keyPoints: ["Point 3"] },
    { id: "sec_4", title: "4. Deployment Strategy", brief: "Rollout timeline", keyPoints: ["Point 4"] }
  ];

  const dummySources = [
    { index: 1, title: "Test Source", url: "https://example.com", snippet: "Verified benchmark metrics." }
  ];

  console.log("--- TEST 1: Logging Current Batch Concurrency Behavior ---");
  const BATCH_SIZE = 2;
  const dispatchEvents: Array<{ time: number; sectionId: string; event: string }> = [];
  const startGlobal = Date.now();

  for (let b = 0; b < testSections.length; b += BATCH_SIZE) {
    const currentBatch = testSections.slice(b, b + BATCH_SIZE);
    console.log(`[Dispatch] Firing Batch ${Math.floor(b / BATCH_SIZE) + 1}: Sections [${currentBatch.map(s => s.id).join(", ")}] at +${Date.now() - startGlobal}ms`);

    await Promise.all(
      currentBatch.map(async (sec) => {
        const tStart = Date.now() - startGlobal;
        dispatchEvents.push({ time: tStart, sectionId: sec.id, event: "START" });
        console.log(`  -> [${sec.id}] STARTED at +${tStart}ms`);

        await generateSectionProse("Test Document", sec as any, dummySources, {
          geminiModel: "gemini-2.5-flash-lite",
          targetChapterWords: 350
        });

        const tEnd = Date.now() - startGlobal;
        dispatchEvents.push({ time: tEnd, sectionId: sec.id, event: "END" });
        console.log(`  -> [${sec.id}] COMPLETED at +${tEnd}ms (Duration: ${tEnd - tStart}ms)`);
      })
    );
  }

  console.log("\n================================================================================");
  console.log("📊 CONCURRENCY TIMELINE SUMMARY:");
  console.log("================================================================================");
  console.table(dispatchEvents);

  // Analyze overlap
  const sec1Start = dispatchEvents.find(e => e.sectionId === "sec_1" && e.event === "START")?.time || 0;
  const sec2Start = dispatchEvents.find(e => e.sectionId === "sec_2" && e.event === "START")?.time || 0;
  const sec1End = dispatchEvents.find(e => e.sectionId === "sec_1" && e.event === "END")?.time || 0;

  const isSec1and2Concurrent = sec2Start < sec1End;
  console.log(`Sec 1 Start: +${sec1Start}ms, End: +${sec1End}ms`);
  console.log(`Sec 2 Start: +${sec2Start}ms`);
  console.log(`Were Section 1 & 2 dispatched concurrently? ${isSec1and2Concurrent ? "YES (Concurrent)" : "NO (Sequential)"}`);

  const sec3Start = dispatchEvents.find(e => e.sectionId === "sec_3" && e.event === "START")?.time || 0;
  const sec2End = dispatchEvents.find(e => e.sectionId === "sec_2" && e.event === "END")?.time || 0;
  console.log(`Did Section 3 wait for Section 2 (Batch Barrier)? ${sec3Start >= Math.max(sec1End, sec2End) ? "YES (Blocked by Batch Barrier)" : "NO (Sliding Queue)"}`);
}

verifySectionConcurrency().catch(err => {
  console.error("Concurrency verification failed:", err);
  process.exit(1);
});
