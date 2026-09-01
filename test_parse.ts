import { TextRun } from "docx";
function parseInlineFormatting(text: string): any[] {
  const runs: any[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|_.*?_)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: text.substring(lastIndex, match.index) });
    }
    
    const matchedText = match[0];
    if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
      runs.push({ text: matchedText.substring(2, matchedText.length - 2), bold: true });
    } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
      runs.push({ text: matchedText.substring(1, matchedText.length - 1), italics: true });
    } else if (matchedText.startsWith('_') && matchedText.endsWith('_')) {
      runs.push({ text: matchedText.substring(1, matchedText.length - 1), italics: true });
    } else {
      runs.push({ text: matchedText });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    runs.push({ text: text.substring(lastIndex) });
  }
  
  return runs.length > 0 ? runs : [{ text }];
}

console.log(parseInlineFormatting("This is a **test** of *italics* and _more_."));
