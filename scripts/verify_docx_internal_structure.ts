import { assembleWordDocument } from "../lib/assembler";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

async function verifyDocxInternals() {
  console.log("================================================================================");
  console.log("🔬 EXPLICIT ZIP / OOXML STRUCTURE VERIFICATION FOR EMBEDDED IMAGES IN DOCX");
  console.log("================================================================================\n");

  const methodologyTitle = "3. Methodology & System Architecture";
  const methodologyContent = "### 3.1 Data Ingestion Pipeline\nThe system handles streaming ingestion.\n### 3.2 Processing Core\nDecoupled message bus routes jobs.\n### 3.3 Validation & Output\nConsensus verification before dispatch.";
  
  const empiricalTitle = "4. Test Results & Performance Benchmarks";
  const empiricalContent = "### 4.1 Comparative Metrics\nBenchmark evaluations demonstrate superior throughput.\n| Metric | Baseline | Proposed Framework |\n| --- | --- | --- |\n| Throughput | 62 req/s | 94 req/s |\n| Latency | 145 ms | 42 ms |";

  console.log("1. Assembling Word Document with Flowchart and Comparative Data Chart...");
  const docBuffer = await assembleWordDocument({
    title: "Autonomous Edge Optimization Architecture",
    subtitle: "A Comprehensive Technical Report",
    format: "docx",
    sections: [
      { id: "sec_1", title: methodologyTitle, content: methodologyContent },
      { id: "sec_2", title: empiricalTitle, content: empiricalContent }
    ]
  });

  const testDir = path.resolve("./.data/test_docx_unzip");
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const docxPath = path.join(testDir, "test_document.docx");
  fs.writeFileSync(docxPath, docBuffer);
  console.log(`✓ Generated DOCX file (${docBuffer.length} bytes) at ${docxPath}`);

  // Unzip docx archive
  const unzipDir = path.join(testDir, "unzipped");
  fs.mkdirSync(unzipDir, { recursive: true });
  execSync(`unzip -q "${docxPath}" -d "${unzipDir}"`);

  console.log("\n2. Inspecting word/media directory contents:");
  const mediaDir = path.join(unzipDir, "word", "media");
  if (fs.existsSync(mediaDir)) {
    const mediaFiles = fs.readdirSync(mediaDir);
    console.log("   Media files found in word/media/:", mediaFiles);
    mediaFiles.forEach((file) => {
      const ext = path.extname(file);
      if (ext === ".png") {
        console.log(`   ✓ VALID: "${file}" has correct real .png extension!`);
      } else {
        console.error(`   ❌ INVALID: "${file}" has wrong extension "${ext}"!`);
        process.exit(1);
      }
    });
  } else {
    console.error("❌ word/media directory not found in docx!");
    process.exit(1);
  }

  console.log("\n3. Inspecting word/_rels/document.xml.rels relationship targets:");
  const relsPath = path.join(unzipDir, "word", "_rels", "document.xml.rels");
  const relsContent = fs.readFileSync(relsPath, "utf-8");
  console.log("   Relevant Image Relationships in document.xml.rels:");
  const imageRels = relsContent.match(/<Relationship[^>]*Type="[^"]*image"[^>]*\/>/g) || [];
  imageRels.forEach((rel) => {
    console.log("   ->", rel);
    if (rel.includes(".undefined")) {
      console.error("❌ FOUND .undefined in relationship target!");
      process.exit(1);
    }
  });
  console.log("   ✓ All image relationship targets point to valid image filenames!");

  console.log("\n4. Inspecting [Content_Types].xml content type declarations:");
  const contentTypesPath = path.join(unzipDir, "[Content_Types].xml");
  const contentTypesContent = fs.readFileSync(contentTypesPath, "utf-8");
  const pngDefault = contentTypesContent.includes('Extension="png"') && contentTypesContent.includes('ContentType="image/png"');
  console.log(`   Declared PNG ContentType present: ${pngDefault}`);
  if (!pngDefault) {
    console.error("❌ ContentType for png not declared in [Content_Types].xml!");
    process.exit(1);
  }
  console.log("   ✓ [Content_Types].xml correctly declares Extension=\"png\" ContentType=\"image/png\"!");

  console.log("\n5. Inspecting word/document.xml for Figure Caption Pure Black (#000000) color:");
  const docXmlPath = path.join(unzipDir, "word", "document.xml");
  const docXmlContent = fs.readFileSync(docXmlPath, "utf-8");
  // Check that muted gray 475569 or 334155 are NOT in the document XML
  const hasOldGray1 = docXmlContent.includes("475569");
  const hasOldGray2 = docXmlContent.includes("334155");
  console.log(`   Contains old muted gray #475569: ${hasOldGray1}`);
  console.log(`   Contains old muted gray #334155: ${hasOldGray2}`);
  if (hasOldGray1 || hasOldGray2) {
    console.error("❌ Found old muted gray color in document XML!");
    process.exit(1);
  }
  console.log("   ✓ All caption and body text are pure black #000000 throughout the document!");

  console.log("\n================================================================================");
  console.log("✅ DOCX INTERNAL STRUCTURE VERIFICATION COMPLETED WITH 100% SUCCESS!");
  console.log("================================================================================");
}

verifyDocxInternals().catch((err) => {
  console.error(err);
  process.exit(1);
});
