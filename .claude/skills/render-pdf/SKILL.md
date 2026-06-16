---
name: render-pdf
description: Fill a branded HTML template with content and render it to a PDF that matches The Place & Market website. Use when producing the diagnostic or strategy deliverable PDF. Wraps scripts/generate-pdf.js (system Chrome, no npm deps).
---

# Render a branded PDF

Turn a filled HTML template into an A4 PDF in `out/`, styled to match the website (Cormorant Garamond + DM Sans, gold `#C9A84C`, dark/cream).

## Templates
- `templates/diagnostic.html` — free diagnostic
- `templates/strategy.html` — paid strategy
- `templates/print.css` — shared brand/print styles (don't duplicate; both templates link it as `../templates/print.css`)

## Fill, then render
1. **Copy** the template to a working file, e.g. `out/<client-slug>-diagnostic.html`. Keep the `<link rel="stylesheet" href="../templates/print.css">` line — it resolves from `out/` and the renderer inlines it.
2. **Replace** the `{{TOKENS}}` (e.g. `{{CLIENT}}`, `{{WINE}}`, `{{TARGET}}`, `{{EXW}}`, `{{SHELF}}`) and the content inside each `<!-- SLOT:name -->` region with real content. Match the surrounding HTML — reuse the existing classes (`.walk`, `.band`, `.callout`, `.slot`, `.section-label`, `td.num`). Do not restyle.
3. **Render:**
   ```bash
   node scripts/generate-pdf.js out/<client-slug>-diagnostic.html out/<client-slug>-diagnostic.pdf
   ```

## Verify before handing back
Screenshot a page and check the brand match (per CLAUDE.md): Cormorant headings, gold accents, tabular figures aligned, no stray `{{TOKENS}}` left, key rows (LANDED, FRONT LINE) highlighted. To screenshot, stage an inlined copy and use system Chrome `--headless=new --screenshot` into the OS temp dir (Chrome cannot write into the Google-Drive folder; `generate-pdf.js` already handles this for PDFs by staging in temp and copying back).

## Notes
- Numbers come from the `pricing-model` skill; competitive rows from `competitive-research`. This skill only renders.
- For the **strategy** template, leave every `.slot` ("★ Daley —") for Daley. Fill only the analysis/`SLOT:` regions, never the recommendation slots.
