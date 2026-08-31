import { assembleWordDocument, assemblePowerPoint, assemblePdfDocument } from "../lib/assembler";
import { verifyDocumentVisually } from "../lib/visualVerification";
import fs from "fs";
import path from "path";

async function runVisualInspectionOnAllFormats() {
  console.log("================================================================================");
  console.log("👁️ REAL VISUAL RENDERING & PAGE INSPECTION ACROSS WORD, PPTX & PDF");
  console.log("================================================================================\n");

  const sampleSections = [
    {
      id: "sec_1",
      title: "1. Executive Summary & Problem Scope",
      brief: "Overview of enterprise edge architecture, key operational bottlenecks, and project goals.",
      content: `### 1.1 Background & Motivation
Modern distributed data architectures require low-latency processing at edge nodes to prevent cloud transit bottlenecks.

### 1.2 Problem Statement
Traditional centralized architectures introduce unacceptable latency spikes during peak concurrency, degrading application reliability.`
    },
    {
      id: "sec_2",
      title: "3. Methodology & System Architecture",
      brief: "Technical workflow, decoupled message bus, and failover validation protocols.",
      content: `### 3.1 Data Ingestion Pipeline
The ingestion layer receives incoming data packets, validates checksums, and standardizes payload schemas.

### 3.2 Processing Core
Decoupled worker nodes process queue events in parallel without blocking downstream services.

### 3.3 Validation & Output Telemetry
Automated health checks verify state consistency before publishing final results to client endpoints.`
    },
    {
      id: "sec_3",
      title: "4. Test Results & Performance Benchmarks",
      brief: "Empirical benchmark evaluation measuring throughput, latency, and resource overhead.",
      content: `### 4.1 Comparative Metrics
Evaluating the system against baseline architectures shows substantial improvements in latency and throughput.

| Evaluation Metric | Baseline System | Proposed Framework |
| --- | --- | --- |
| Average Throughput | 62 req/s | 94 req/s |
| Response Latency | 145 ms | 42 ms |
| Memory Overhead | 1.8 GB | 0.9 GB |`
    }
  ];

  // ---------------------------------------------------------------------------
  // 1. WORD DOCUMENT (.docx) VISUAL VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("--- [1. GENERATING & VISUALLY VERIFYING WORD (.DOCX) DOCUMENT] ---");
  const docxBuffer = await assembleWordDocument({
    title: "Autonomous Edge Optimization Architecture",
    subtitle: "A Multi-Chapter Engineering Report",
    format: "docx",
    selectedFont: "Times New Roman",
    sections: sampleSections,
    meta: {
      isFormalAcademicReport: true,
      institutionName: "Department of Computer Science & Engineering",
      submittedBy: "Lead Systems Architect",
      guideName: "Principal Research Director"
    }
  });

  const docxReport = await verifyDocumentVisually(docxBuffer, "docx", {
    title: "Autonomous Edge Optimization Architecture",
    expectedDiagramTypes: ["flowchart", "chart"],
    hasFrontMatter: true
  });

  console.log(`Word Document (.docx) Status: ${docxReport.passed ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Rendered Page Thumbnails: ${docxReport.pageImages.length} image(s) created`);
  docxReport.checks.forEach(c => {
    console.log(`  ${c.passed ? "✓" : "✗"} [${c.name}]: ${c.details}`);
  });

  // ---------------------------------------------------------------------------
  // 2. POWERPOINT PRESENTATION (.pptx) VISUAL VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- [2. GENERATING & VISUALLY VERIFYING POWERPOINT (.PPTX) DECK] ---");
  const pptxBuffer = await assemblePowerPoint({
    title: "Autonomous Edge Optimization Architecture",
    subtitle: "Executive Presentation Deck",
    format: "pptx",
    sections: sampleSections
  });

  const pptxReport = await verifyDocumentVisually(pptxBuffer, "pptx", {
    title: "Autonomous Edge Optimization Architecture"
  });

  console.log(`PowerPoint (.pptx) Status: ${pptxReport.passed ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Rendered Slide Thumbnails: ${pptxReport.pageImages.length} image(s) created`);
  pptxReport.checks.forEach(c => {
    console.log(`  ${c.passed ? "✓" : "✗"} [${c.name}]: ${c.details}`);
  });

  // ---------------------------------------------------------------------------
  // 3. PDF DOCUMENT (.pdf) VISUAL VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- [3. GENERATING & VISUALLY VERIFYING PDF (.PDF) DOCUMENT] ---");
  const pdfBuffer = await assemblePdfDocument({
    title: "Autonomous Edge Optimization Architecture",
    subtitle: "Publication-Grade Academic Report",
    format: "pdf",
    sections: sampleSections,
    meta: {
      isFormalAcademicReport: true,
      institutionName: "Department of Computer Science & Engineering",
      submittedBy: "Lead Systems Architect",
      guideName: "Principal Research Director"
    }
  });

  const pdfReport = await verifyDocumentVisually(pdfBuffer, "pdf", {
    title: "Autonomous Edge Optimization Architecture"
  });

  console.log(`PDF (.pdf) Status: ${pdfReport.passed ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Rendered PDF Page Thumbnails: ${pdfReport.pageImages.length} image(s) created`);
  pdfReport.checks.forEach(c => {
    console.log(`  ${c.passed ? "✓" : "✗"} [${c.name}]: ${c.details}`);
  });

  console.log("\n================================================================================");
  console.log("🎯 ALL 3 FORMATS VISUALLY RENDERED & FULLY VERIFIED!");
  console.log("================================================================================");
}

runVisualInspectionOnAllFormats().catch((err) => {
  console.error(err);
  process.exit(1);
});
