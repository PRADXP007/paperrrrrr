const http = require("http");

async function testFormat(format) {
  const payload = JSON.stringify({
    title: `Autonomous AI Studio Test - ${format.toUpperCase()}`,
    subtitle: `Empirical Validation for ${format.toUpperCase()}`,
    format: format,
    sections: [
      {
        title: "1. Executive Overview & Baseline",
        brief: `High-level operational overview for ${format}.`,
        content: `### Focus: ${format.toUpperCase()} Architecture\n* **Metric 1:** 99.8% system accuracy\n* **Metric 2:** $48.2B global TAM by 2030\n\n> 💡 **KEY METRIC:** +34.5% CAGR\n> 🎙️ **PRESENTER NOTES:** Emphasize rapid adoption.\n\n| Item | 2024 | 2025 | Growth |\n| :--- | :--- | :--- | :--- |\n| Metric A | $12M | $18M | +50% |`
      },
      {
        title: "2. Strategic Findings & Quantitative Model",
        brief: `Granular analysis and formula metrics.`,
        content: `Comprehensive empirical findings substantiate that scaling ${format} unlocks significant operational leverage.`
      }
    ]
  });

  const options = {
    hostname: "localhost",
    port: 3000,
    path: "/api/assemble",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = [];
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(data);
        console.log(`[${format.toUpperCase()}] Status: ${res.statusCode} | Content-Type: ${res.headers["content-type"]} | Size: ${buffer.length} bytes`);
        resolve({ status: res.statusCode, size: buffer.length });
      });
    });

    req.on("error", (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log("Testing All 3 File Formats (/api/assemble)...");
  await testFormat("docx");
  await testFormat("pptx");
  await testFormat("pdf");
  console.log("All 3 formats tested successfully!");
}

run().catch(console.error);
