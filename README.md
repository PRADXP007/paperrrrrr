<div align="center">

# 📄 Paperrrrrr — Academic & Research Document Studio

**Publication-Grade Multi-Format Document Studio: IEEE 2-Column Papers, Multi-Chapter Project Reports & 16:9 Presentation Decks**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-paperrrrrr.vercel.app-7F56D9?style=for-the-badge&logo=vercel)](https://paperrrrrr.vercel.app)
[![GitHub Repository](https://img.shields.io/badge/GitHub-PRADXP007%2Fpaperrrrrr-181717?style=for-the-badge&logo=github)](https://github.com/PRADXP007/paperrrrrr)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS v4](https://img.shields.io/badge/TailwindCSS-v4-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

[**Explore Live Demo 🚀**](https://paperrrrrr.vercel.app) • [**Report Bug / Feedback**](https://github.com/PRADXP007/paperrrrrr/issues)

</div>

---

## 🌟 Overview

**Paperrrrrr** is a publication-grade document synthesis platform. Powered by **Google Gemini 2.5/3.6 Flash** and **Tavily Live Web Retrieval**, Paperrrrrr researches, outlines, structures, and compiles high-density academic and project deliverables into editable, perfectly styled files:

1. 📑 **Standard IEEE 2-Column Research Papers (.docx & .pdf)** — Full compliance with official IEEE conference & journal specifications (24pt title, 3-column author affiliation grid, run-in `Abstract—` & `Keywords—`, Roman numeral section headings, mathematical equations `(1)`, structured data tables, and bracketed references `[1]`).
2. 📊 **Modern 16:9 Presentation Decks (.pptx)** — Widescreen slides powered by `pptxgenjs` with curated color palettes (*Midnight Executive*, *Teal Trust*, *Warm Terracotta*, *Ocean Gradient*), diverse layout engines (KPI metrics, split scope, 3-pillar columns, horizontal roadmaps), and automatic native speaker notes.
3. 📚 **Academic & Project Reports (.docx & .pdf)** — Multi-chapter manuscripts complete with institutional front matter (Bonafide Certificate, Declaration, Acknowledgement, Abstract, Table of Contents with tab leaders, chapter scope summaries, and bibliography).

---

## 🚀 Live Application

The production application is live and hosted on Vercel:

👉 **[https://paperrrrrr.vercel.app](https://paperrrrrr.vercel.app)**

---

## ✨ Core Features

### 1. 🏛️ Official IEEE Standard 2-Column Format
- **Strict IEEE Page Geometry**: Standard A4/US Letter with `0.75"` top, `1.0"` bottom, and `0.625"` left/right margins.
- **Continuous Two-Column Sectioning**: Full-width header (Title, Authors, Abstract, Keywords) transitioning smoothly into a 2-column body (`0.5"` column gap).
- **Typographic Precision**:
  - Paper Title: `24pt` Times New Roman, Centered.
  - Multi-Author Affiliation Grid: Up to 6 authors in clean 3-column layout.
  - Abstract & Keywords: `Abstract—` and `Keywords—` bold-italic run-in headings.
  - Primary Headings: `I. INTRODUCTION`, `II. RELATED WORK`, etc. in `10pt` Bold Centered/Small-Caps.
  - Secondary & Tertiary Headings: `A. System Architecture` (Italic) and `1) Mathematical Model:` (Run-in).
  - Numbered Equations: Centered mathematical formula with right-aligned `(1)`.
  - Tables & Figures: Captions positioned according to IEEE rules (`TABLE I.` above tables, `Fig. 1.` below figures).
  - Bracketed Citation System: `[1]`, `[2]`, `[1]–[3]` referencing real empirical literature.

### 2. 📊 Modern 16:9 Presentation Engineering (.pptx)
- **100% Native PPTX**: Generated programmatically using `pptxgenjs` (no rasterized text images).
- **Anti-Corruption Geometry**: Exact `LAYOUT_16x9` coordinate bounding with 0.5"+ margins.
- **Multi-Layout Variety**:
  - *Layout 1: Executive Title Cover* (Dark Theme sandwich).
  - *Layout 2: Executive Agenda & Taxonomy Grid* (2-column card layout).
  - *Layout 3: Big Stat & KPI Metric Highlights* (3 equal-width metric showcase cards with `28-44pt` numbers).
  - *Layout 4: Split Two-Column Focus* (Executive scope + empirical takeaway bullets).
  - *Layout 5: Strategic Pillar Columns* (3 comparative columns with pill badges).
  - *Layout 6: Horizontal Phased Roadmap* (Sequential phase indicators and milestone targets).
  - *Layout 7: Strategic Verdict Closing* (Dark closing sandwich with executive directives and Q&A).
- **Topic-Informed Palettes**: Automatically selects harmonious color palettes (60–70% dominant, supporting secondary, sharp accent).
- **Native Speaker Notes**: Every slide contains presenter talking points in `slide.addNotes()`.

### 3. 🔍 Empirical Grounding & Anti-Hallucination Engine
- **Live Multi-Source Web Retrieval**: Queries live web datasets via Tavily API before generation.
- **Zero Fabricated Numbers**: All quantitative data points, CAGR metrics, and benchmarks are grounded in real research snippets with authentic citation links.
- **Streaming Generation**: Real-time Server-Sent Events (SSE) streaming updates the UI chapter-by-chapter.

### 4. 🖥️ Interactive Deck & Document Studio UI
- **In-Browser Slide Viewer**: Full HD 1080p preview with single-slide view, full-deck grid gallery, thumbnail selector, and speaker notes toggle.
- **Dynamic Word & Page Budgeter**: Real-time calculations for word counts, chapters, and printed pages based on document depth settings.
- **Custom Model & Key Support**: Bring your own Google Gemini or OpenAI API keys directly in the UI.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server Actions, Route Handlers) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Frontend UI** | [React 19](https://react.dev/), [TailwindCSS v4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/) |
| **Document Generation** | [`docx`](https://docx.js.org/) (Word .docx), [`pptxgenjs`](https://gitbrent.github.io/PptxGenJS/) (PowerPoint .pptx), [`pdfkit`](https://pdfkit.org/) (PDF) |
| **AI Models** | [Google Gemini](https://ai.google.dev/) (`@google/genai` - `gemini-2.5-flash`, `gemini-3.6-flash`), [OpenAI](https://openai.com/) (`gpt-4o-mini`) |
| **Live Research** | [Tavily AI Search](https://tavily.com/) (`@tavily/core`) |
| **Database & Auth** | [MongoDB](https://www.mongodb.com/) / Mongoose, Jose (JWT), BcryptJS |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 📂 Project Structure

```
paperrrrrr/
├── .agents/                      # Agent skill definitions & rules
│   └── skills/
│       ├── ieee-format/SKILL.md  # Formal IEEE 2-Column specification
│       └── pptx/SKILL.md         # PPTX presentation engineering rules
├── app/                          # Next.js 16 App Router
│   ├── api/                      # Backend API Route Handlers
│   │   ├── assemble/             # Assembles binary .docx, .pptx, .pdf files
│   │   ├── generate-stream/      # SSE streaming document generator
│   │   ├── outline/              # Structured outline synthesis
│   │   └── research/             # Tavily live web research endpoint
│   ├── layout.tsx                # Root layout and theme providers
│   └── page.tsx                  # Document Maker Studio main application
├── components/                   # Reusable UI component library
│   └── untitledui/               # PPTXDeckViewer, Buttons, Badges, Modals
├── lib/                          # Core business logic & engines
│   ├── ai.ts                     # AI orchestration, prompt engineering & schemas
│   ├── assembler.ts              # DOCX, IEEE, PPTX, and PDF binary builders
│   ├── localStore.ts             # Client-side fallback storage
│   ├── mongodb.ts                # Database connection helper
│   └── tavily.ts                 # Live search & snippet curation
├── models/                       # Mongoose data schemas
├── scripts/                      # Verification and test suites
│   ├── test-ieee.cjs             # IEEE 2-column Word document test
│   ├── test-ppt.cjs              # Modern multi-layout PPTX test
│   └── test-all-formats.cjs      # End-to-end multi-format verification
├── package.json
└── README.md
```

---

## ⚡ Getting Started (Local Development)

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm** or **pnpm** / **yarn**
- API Keys:
  - [Google Gemini API Key](https://aistudio.google.com/) (`GEMINI_API_KEY`)
  - [Tavily API Key](https://tavily.com/) (`TAVILY_API_KEY`)
  - *(Optional)* [MongoDB URI](https://www.mongodb.com/atlas) (`MONGODB_URI`)

### 1. Clone the Repository
```bash
git clone https://github.com/PRADXP007/paperrrrrr.git
cd paperrrrrr
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# Required for AI Generation & Research
GEMINI_API_KEY="your_gemini_api_key_here"
TAVILY_API_KEY="your_tavily_api_key_here"

# Optional: MongoDB for persistent document library
MONGODB_URI="mongodb+srv://..."
JWT_SECRET="your_secure_jwt_secret"
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Document Generation

Run the standalone CLI test suites to generate sample documents locally:

```bash
# Test IEEE 2-Column Standard Word Document (.docx)
npx tsx scripts/test-ieee.cjs

# Test Modern Multi-Layout PowerPoint Presentation (.pptx)
node scripts/test-ppt.cjs
```

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">
Built with precision by <b>Pradeep H.</b> • Hosted on <a href="https://paperrrrrr.vercel.app"><b>Vercel</b></a>
</div>
