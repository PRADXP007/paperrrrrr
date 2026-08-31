import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { generateSectionProse } from "../lib/ai";

async function testSlidingQueue() {
  console.log("================================================================================");
  console.log("⚡ TESTING SLIDING WORKER CONCURRENCY QUEUE (3 WORKERS)");
  console.log("================================================================================\n");

  const testSections = [
    { id: "sec_1", title: "1. Executive Summary", brief: "Overview", keyPoints: ["Point 1"] },
    { id: "sec_2", title: "2. Technical Architecture", brief: "System components", keyPoints: ["Point 2"] },
    { id: "sec_3", title: "3. Empirical Benchmarks", brief: "Performance metrics", keyPoints: ["Point 3"] },
    { id: "sec_4", title: "4. Implementation Strategy", brief: "Rollout phases", keyPoints: ["Point 4"] },
    { id: "sec_5", title: "5. Security & Risk Governance", brief: "Mitigation matrix", keyPoints: ["Point 5"] },
    { id: "sec_6", title: "6. Economic Feasibility", brief: "Unit economics", keyPoints: ["Point 6"] }
  ];

  const dummySources = [
    { index: 1, title: "Test Source", url: "https://example.com", snippet: "Empirical benchmark metrics." }
  ];

  const events: Array<{ time: number; workerId: number; sectionId: string; event: string }> = [];
  const startGlobal = Date.now();
  const CONCURRENCY = 3;
  let nextIdx = 0;

  console.log(`Launching ${CONCURRENCY} concurrent workers for ${testSections.length} sections...`);

  const workers = Array.from({ length: CONCURRENCY }, async (_, workerId) => {
    while (nextIdx < testSections.length) {
      const i = nextIdx++;
      const sec = testSections[i];
      const tStart = Date.now() - startGlobal;
      events.push({ time: tStart, workerId: workerId + 1, sectionId: sec.id, event: "START" });
      console.log(`  [Worker ${workerId + 1}] STARTED ${sec.id} at +${tStart}ms`);

      await generateSectionProse("Concurrency Test", sec as any, dummySources, {
        geminiModel: "gemini-2.5-flash-lite",
        targetChapterWords: 300
      });

      const tEnd = Date.now() - startGlobal;
      events.push({ time: tEnd, workerId: workerId + 1, sectionId: sec.id, event: "END" });
      console.log(`  [Worker ${workerId + 1}] ✓ COMPLETED ${sec.id} at +${tEnd}ms (Duration: ${tEnd - tStart}ms)`);
    }
  });

  await Promise.all(workers);

  const totalDuration = Date.now() - startGlobal;
  console.log("\n================================================================================");
  console.log(`🏆 ALL 6 SECTIONS COMPLETED IN ${totalDuration}ms (Average: ${(totalDuration / 6).toFixed(0)}ms/section)`);
  console.log("================================================================================");
  console.table(events);

  // Assertions
  const startTimes = events.filter(e => e.event === "START").map(e => e.time);
  const initialConcurrentStarts = startTimes.filter(t => t < 100).length;
  console.log(`Initial Concurrent Sections Dispatched: ${initialConcurrentStarts} (Expected: 3)`);

  if (initialConcurrentStarts !== 3) {
    throw new Error(`FAILED: Expected 3 concurrent starts, got ${initialConcurrentStarts}`);
  }

  console.log("✅ SLIDING CONCURRENCY QUEUE VERIFIED SUCCESSFULLY!");
}

testSlidingQueue().catch(err => {
  console.error(err);
  process.exit(1);
});
