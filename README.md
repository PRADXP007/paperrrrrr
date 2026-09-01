# Paperrrrrr: The Intelligent Document Studio 📄✨

Paperrrrrr is a next-generation AI-powered document generation suite designed to seamlessly research, draft, and format high-quality long-form documents. Whether you need a corporate executive summary, an elaborate engineering thesis, or an academic research paper, Paperrrrrr automates the entire process from blank page to fully assembled `.docx`, `.pptx`, or `.pdf` file.

## 🌟 Key Features

- **Live Web Research Integration**: Powered by the **Tavily API**, Paperrrrrr doesn't just guess—it researches. It gathers verifiable, up-to-date data, official statistics, and academic benchmarks to ground your document in reality.
- **Context-Aware AI Drafting**: Driven by **Google Gemini 3.1 Pro**, the system dynamically scales its tone and depth based on your specified audience context (School, College, Engineering, Corporate).
- **Targeted Pacing & Length**: Need exactly 15 pages? Or 150 pages? Paperrrrrr automatically budgets chapter lengths and seamlessly expands sections until your precise target length is met.
- **Beautiful, Live-Streaming UI**: A premium user interface featuring interactive terminal-style logs, smooth micro-animations, and live-streaming generation updates so you can watch your document come to life chapter by chapter.
- **Native Document Assembly**: Exports fully structured, native Word documents (`.docx`), PowerPoint slide decks (`.pptx`), and PDFs, complete with typography and color profile customizations.

## 🚀 How It Works

1. **Configure**: Start by describing your topic. Select your desired formatting (Target Audience, Typography, Colors, and Total Pages).
2. **Research & Outline**: Paperrrrrr connects to the web to gather sources and builds a structured, multi-chapter outline.
3. **Stream & Draft**: The intelligent pipeline concurrently drafts sections, using a sliding worker queue to guarantee completion without hitting rate limits. 
4. **Assemble**: Once drafting is finished, the document is packaged with your styling choices and offered as a direct download.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions)
- **AI/LLM**: [Google Gen AI SDK](https://github.com/google/genai-js) (Gemini 3.1 Pro)
- **Search API**: [Tavily](https://tavily.com/)
- **Document Generation**: `docx`, `pptxgenjs`, `pdf-lib`
- **UI Components**: React, Tailwind CSS, Framer Motion, Magic UI

## ⚙️ Getting Started

### Prerequisites

You will need the following API keys to run Paperrrrrr locally:
- `GEMINI_API_KEY` (Google Gemini API)
- `TAVILY_API_KEY` (Tavily Search API)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/PRADXP007/paperrrrrr.git
   cd paperrrrrr
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your keys:
   ```env
   GEMINI_API_KEY=your_gemini_key_here
   TAVILY_API_KEY=your_tavily_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## 🎨 Architecture & Design Philosophy

Paperrrrrr is built with a focus on **Premium Aesthetics** and **Systematic Generation**. It utilizes specific design tokens, sleek typography (Times New Roman natively supported), and a robust backend state machine managed through React Context to ensure all user choices persist deeply into the final file structure.

---
*Built with ❤️ for intelligent, effortless writing.*
