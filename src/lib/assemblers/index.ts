import { AssembleDocumentInput } from "@/types/document";
import { assembleWordDocument } from "./report";
import { assembleIEEEWordDocument } from "./ieee";
import { assemblePowerPoint } from "./pptx";
import { assemblePdfDocument } from "./pdf";

export async function generateDocument(input: AssembleDocumentInput): Promise<Buffer> {
  const { format, isIEEEPaper } = input.settings;

  if (format === "pptx") {
    return await assemblePowerPoint(input);
  }

  if (format === "pdf") {
    return await assemblePdfDocument(input);
  }

  // format === "docx"
  if (isIEEEPaper || input.settings.docType === "IEEE Format" || input.settings.reportCategory === "IEEE") {
    return await assembleIEEEWordDocument(input);
  }

  return await assembleWordDocument(input);
}
