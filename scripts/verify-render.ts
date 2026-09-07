import { generateDocument } from "../src/lib/assemblers";
import fs from "fs";
import path from "path";

async function verify() {
  console.log("Starting Document Rendering Verification...");
  
  const dummyInput = {
    settings: {
      title: "Verification Document",
      subtitle: "Automated Render Test",
      format: "pdf",
      docType: "Research Report",
      isIEEEPaper: false,
      selectedFont: "Times New Roman",
      accentColor: "0078D4",
    },
    sections: [
      {
        id: "1",
        title: "1. Introduction",
        content: "This is a test of the PDF assembly pipeline.\n\nIt should correctly render multiple paragraphs."
      }
    ]
  };

  try {
    const buffer = await generateDocument(dummyInput as any);
    if (buffer.length > 0) {
      console.log(`✅ PDF rendering successful. Buffer size: ${buffer.length} bytes.`);
      const testPath = path.join(process.cwd(), ".data", "test-render.pdf");
      if (!fs.existsSync(path.dirname(testPath))) fs.mkdirSync(path.dirname(testPath));
      fs.writeFileSync(testPath, buffer);
      console.log(`Saved output to ${testPath}`);
    } else {
      console.error("❌ PDF rendering produced empty buffer.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ PDF rendering failed:", error);
    process.exit(1);
  }
}

verify();
