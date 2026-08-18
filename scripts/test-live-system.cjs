const http = require("http");

function makeRequest(path, method = "GET", payload = null) {
  return new Promise((resolve, reject) => {
    const postData = payload ? JSON.stringify(payload) : "";
    const options = {
      hostname: "localhost",
      port: 3000,
      path: path,
      method: method,
      headers: {
        ...(payload ? {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        } : {})
      }
    };

    const req = http.request(options, (res) => {
      let chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const text = buffer.toString("utf8");
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          size: buffer.length,
          text,
          json
        });
      });
    });

    req.on("error", (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log("==================================================");
  console.log("🔍 FULL STACK VERIFICATION SUITE");
  console.log("==================================================\n");

  let allPassed = true;

  // 1. Frontend Homepage Test
  try {
    console.log("1️⃣ Testing Frontend Homepage (GET /)...");
    const homeRes = await makeRequest("/");
    if (homeRes.status === 200 && homeRes.text.includes("Paperrrrrr")) {
      console.log("   ✅ Frontend Home Loaded Successfully: HTTP 200 (HTML size: " + homeRes.size + " bytes)");
    } else {
      console.log("   ❌ Frontend Home status: " + homeRes.status);
      allPassed = false;
    }
  } catch (err) {
    console.log("   ❌ Frontend Home Error:", err.message);
    allPassed = false;
  }

  // 2. Backend Document Assembly (DOCX - IEEE 2-Column Standard)
  try {
    console.log("\n2️⃣ Testing Backend Assembly - IEEE 2-Column DOCX (/api/assemble)...");
    const docxPayload = {
      title: "Deep Reinforcement Learning in Smart Grids",
      subtitle: "IEEE Standard Research Manuscript",
      format: "docx",
      docType: "Research Paper",
      isIEEEPaper: true,
      sections: [
        {
          title: "Abstract & Keywords",
          brief: "Comprehensive abstract for smart grid BESS.",
          content: "Abstract—This paper evaluates reinforcement learning algorithms for real-time dispatch in modern microgrids.\n\nKeywords—Smart grid, BESS, deep reinforcement learning, IEEE"
        },
        {
          title: "I. INTRODUCTION",
          brief: "Introduction to grid dispatch.",
          content: "Renewable energy integration has created urgent demands for grid-scale energy storage [1]."
        }
      ]
    };

    const docxRes = await makeRequest("/api/assemble", "POST", docxPayload);
    if (docxRes.status === 200 && docxRes.headers["content-type"].includes("wordprocessingml")) {
      console.log("   ✅ Backend DOCX (IEEE 2-Column) Assembly: HTTP 200 (" + docxRes.size + " bytes)");
    } else {
      console.log("   ❌ DOCX Assembly failed:", docxRes.status, docxRes.text);
      allPassed = false;
    }
  } catch (err) {
    console.log("   ❌ DOCX Assembly Error:", err.message);
    allPassed = false;
  }

  // 3. Backend Document Assembly (PPTX - Modern 16:9 Presentation)
  try {
    console.log("\n3️⃣ Testing Backend Assembly - 16:9 PPTX Deck (/api/assemble)...");
    const pptxPayload = {
      title: "Renewable Energy Transition Strategy 2030",
      subtitle: "Executive Strategy Deck",
      format: "pptx",
      sections: [
        {
          title: "Slide 1: Executive Landscape",
          brief: "Macro dynamics and growth trajectory.",
          content: "* **Primary Goal:** 500 GW non-fossil capacity\n* **Market Growth:** +34.5% CAGR\n\n> 💡 **KEY METRIC:** 190 GW Installed\n> 🎙️ **PRESENTER NOTES:** Emphasize high-growth solar adoption."
        }
      ]
    };

    const pptxRes = await makeRequest("/api/assemble", "POST", pptxPayload);
    if (pptxRes.status === 200 && pptxRes.headers["content-type"].includes("presentationml")) {
      console.log("   ✅ Backend PPTX Assembly: HTTP 200 (" + pptxRes.size + " bytes)");
    } else {
      console.log("   ❌ PPTX Assembly failed:", pptxRes.status, pptxRes.text);
      allPassed = false;
    }
  } catch (err) {
    console.log("   ❌ PPTX Assembly Error:", err.message);
    allPassed = false;
  }

  // 4. Backend Document Assembly (PDF - Printable Format)
  try {
    console.log("\n4️⃣ Testing Backend Assembly - Printable PDF (/api/assemble)...");
    const pdfPayload = {
      title: "Empirical Analysis of Clean Energy",
      subtitle: "Comprehensive Academic Assessment",
      format: "pdf",
      sections: [
        {
          title: "1. Introduction",
          brief: "Scope and background.",
          content: "Empirical baseline measurements demonstrate substantial improvements in clean energy generation."
        }
      ]
    };

    const pdfRes = await makeRequest("/api/assemble", "POST", pdfPayload);
    if (pdfRes.status === 200 && pdfRes.headers["content-type"].includes("application/pdf")) {
      console.log("   ✅ Backend PDF Assembly: HTTP 200 (" + pdfRes.size + " bytes)");
    } else {
      console.log("   ❌ PDF Assembly failed:", pdfRes.status, pdfRes.text);
      allPassed = false;
    }
  } catch (err) {
    console.log("   ❌ PDF Assembly Error:", err.message);
    allPassed = false;
  }

  // 5. Backend Outline Generation (/api/outline)
  try {
    console.log("\n5️⃣ Testing AI Outline Generation (/api/outline)...");
    const outlinePayload = {
      prompt: "Quantum Computing Algorithms in Cryptography",
      format: "docx",
      docType: "Research Paper",
      targetLength: "Standard (10–15 Pages)"
    };

    const outlineRes = await makeRequest("/api/outline", "POST", outlinePayload);
    if (outlineRes.status === 200 && outlineRes.json && outlineRes.json.outline && outlineRes.json.outline.sections) {
      console.log("   ✅ AI Outline Generated Successfully: HTTP 200 (" + outlineRes.json.outline.sections.length + " sections created)");
    } else {
      console.log("   ❌ Outline Generation status:", outlineRes.status, outlineRes.text.slice(0, 100));
      allPassed = false;
    }
  } catch (err) {
    console.log("   ❌ Outline Error:", err.message);
    allPassed = false;
  }

  console.log("\n==================================================");
  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED: Frontend & Backend are running flawlessly!");
  } else {
    console.log("⚠️ Some tests encountered issues. Review details above.");
  }
  console.log("==================================================\n");
}

runTests();
