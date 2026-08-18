---
name: pptx
description: Use this skill any time a .pptx or .potx file is involved in any way — as input, output, or both. This includes creating slide decks, pitch decks, or presentations; reading, parsing, or extracting text from any .pptx or .potx file; editing, modifying, or updating existing presentations; working with templates, layouts, speaker notes, or comments. Trigger whenever the user mentions "deck," "slides," "presentation," or references a .pptx or .potx filename.
---

# PPTX Creation, Editing, and Presentation Engineering

## Core Architecture & Engine
A `.pptx` is a ZIP archive of OOXML files. We generate presentations programmatically using `pptxgenjs` (Node.js/TypeScript) or Python (`python-pptx`, `defusedxml.minidom`).

### Critical PPTXGenJS Rules & Anti-Corruptions:
1. **Canvas Geometry & Layout**:
   - `LAYOUT_16x9`: 10.0" wide × 5.625" high (NOT 13.3" wide). All coordinates must fit within `10.0" × 5.625"`.
   - `LAYOUT_WIDE`: 13.333" wide × 7.5" high.
   - Always set `pres.layout = "LAYOUT_16x9"` (or `"LAYOUT_WIDE"`) before adding slides.
   - Keep minimum 0.5" margins from all slide boundaries (`x >= 0.6`, `y >= 0.5`, `w <= 8.8` for 10" width).

2. **Color System & Hex Codes**:
   - **Never `#` and never 8-digit hex**. Use `"1E2761"` (NOT `"#1E2761"` and NOT `"1E2761FF"`).
   - Use `transparency: 0-100` on fills/images, `opacity: 0.0-1.0` on shadows.
   - Curated palettes with 60-70% dominant color, 1-2 supporting tones, and 1 sharp accent.

3. **Options Object Immutability**:
   - `pptxgenjs` mutates option objects in place (converting values to EMU on first use).
   - **Never share an options/shadow object across multiple calls**. Construct a fresh object literal for every element.

4. **Typography & Font Safety**:
   - Use Office-safe fonts: `Cambria`, `Century Schoolbook`, `Arial`, `Calibri`, `Times New Roman`.
   - Hierarchy:
     - Slide Title: 32-40pt Bold
     - Section Header: 18-22pt Bold
     - Body Text / Bullets: 12-14pt
     - Metric Stat Callout: 32-48pt Bold
     - Captions / Metadata: 9-11pt Muted
   - Character Spacing: use `charSpacing` (never `letterSpacing`).
   - Padding Alignment: Set `margin: 0` on text boxes when aligning text with shapes/borders.

5. **Lists & Bullet Formatting**:
   - Use `{ bullet: true }` or `bullet: { type: "bullet" }`.
   - **NEVER use literal `•` or `-` characters in bullet text** (causes double-bullet bugs).
   - Space bullet items with `paraSpaceAfter: 8-12` (never use `lineSpacing` for item gaps).

6. **Speaker Notes**:
   - Always add executive talking points to `slide.addNotes("...")` (plain text, once per slide).
   - Never put speaker notes into visual text boxes on the canvas.

7. **Shape Constraints**:
   - `rectRadius` only works on `roundRect` (ROUNDED_RECTANGLE), NOT `rect`.
   - Shadow offset must be `>= 0`.

8. **Anti-Hallmarks (NEVER do these AI slide clichés)**:
   - ❌ NEVER put accent lines / underlines under slide titles.
   - ❌ NEVER add full-width top/bottom colored banner stripes.
   - ❌ NEVER add vertical sidebar edge stripes.
   - ❌ NEVER add single-edge colored borders on card boxes.
   - ❌ NEVER default to dull cream/beige backgrounds (`F5F5DC`).
   - ❌ NEVER center body text (only slide titles may be centered).
   - ❌ NEVER allow text to overflow container boxes.

---

## Slide Layout Diversity & Templates

Every presentation should feature layout variety across slides:
1. **Title Cover Slide (Dark Theme)**: Dark dominant background, high-contrast title (36-40pt), subtitle, metadata pill, author/date footer.
2. **Executive Agenda / Taxonomy Slide (Light Theme)**: 2-column structured grid of presentation sections with rounded cards.
3. **Metric & KPI Highlight Slide (Light Theme)**: 3 high-impact metric cards with large stat callouts (36-44pt) and empirical context.
4. **Split Two-Column Focus Slide (Light Theme)**: Left scope/overview card with light accent tint, right empirical findings with spaced bullets.
5. **Three-Column Strategic Pillars Slide (Light Theme)**: 3 comparative cards with rounded badges and takeaway points.
6. **Horizontal Process Flow / Roadmap Slide (Light Theme)**: 3-4 sequential phase cards with step indicators.
7. **Synthesis & Verdict Slide (Dark Theme - Sandwich Structure)**: Closing dark slide with synthesized takeaways, next steps, and Q&A callout.

---

## Standard Curated Color Palettes

| Theme Name | Primary (Dominant) | Secondary | Accent / Highlight | Background (Content) |
|---|---|---|---|---|
| **Midnight Executive** | `1E2761` (Navy) | `3B82F6` (Electric Blue) | `38BDF8` (Sky) | `FFFFFF` / `F8FAFC` |
| **Teal Trust & Tech** | `028090` (Deep Teal) | `00A896` (Seafoam) | `02C39A` (Mint) | `FFFFFF` / `F8FAFC` |
| **Warm Terracotta** | `B85042` (Terracotta) | `E7E8D1` (Sand) | `A7BEAE` (Sage) | `FFFFFF` / `FAF9F5` |
| **Forest & Moss** | `2C5F2D` (Forest) | `97BC62` (Moss) | `1E293B` (Slate) | `FFFFFF` / `F8FAFC` |
| **Berry & Cream** | `6D2E46` (Berry) | `A26769` (Rose) | `3B82F6` (Accent) | `FFFFFF` / `FAF9F6` |
| **Charcoal Minimal** | `1E293B` (Slate Navy)| `475569` (Slate) | `2563EB` (Cobalt) | `FFFFFF` / `F8FAFC` |

---

## Verification & QA Checklist
- [ ] No hex colors contain `#` or alpha bytes.
- [ ] All coordinates stay within slide boundaries (Width: 10.0" / 13.33", Height: 5.625" / 7.5").
- [ ] Every slide has speaker notes registered via `slide.addNotes()`.
- [ ] No AI accent stripes, full-width edge bars, or title underlines.
- [ ] Options objects are freshly instantiated per call.
- [ ] Text boxes aligned with borders use `margin: 0`.
