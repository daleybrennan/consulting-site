@AGENTS.md

# Pricing Pipeline

## What exists
- `src/lib/pricing-model.ts` — EXW → shelf engine. Call `computePricing(sub)` where `sub` is a `PricingSubmission`. Returns a fully-traced band (low / expected / high), quantity-discount legality, and warnings. Pure, no side effects.
- `src/data/pricing-assumptions.json` — freight, duty, excise, margin defaults by market (US / UK / FR / CA). FX rates included but must be refreshed from live mid-market before any paid deliverable ships.
- `src/data/quantity-discount-rules.json` — legality of volume discounts by market and US state (three-tier). NY = prohibited. CA (US) = allowed. General guidance, not legal advice.
- `templates/diagnostic.html` + `templates/strategy.html` + `templates/print.css` — **LEGACY** static A4 prototype from the pre-rebrand "The Place & Market" identity (gold `#C9A84C`, Cormorant Garamond / DM Sans). NOT used by the live app. The shipped PDF is rendered by `src/lib/pdf-template.ts` + `src/lib/render-pdf.ts` in the **current burgundy brand** (accent `#7b1e3b` on web / `#7c2433` in the PDF, Newsreader headings, Geist body — shared with `src/app/globals.css`). Keep these files only as a reference for the `{{TOKEN}}` / `SLOT:` structure, and re-skin to burgundy before any reuse.

## Two-deliverable model
- **Diagnostic (free):** names the pricing problem, shows EXW→shelf walk + competitive set. NEVER contains the recommendation. Closes with an invitation to commission the strategy.
- **Strategy ($5,000):** full analysis. Machine fills numbers and research; Daley fills the `.slot` blocks (dashed gold boxes, "★ Daley —" tags). Machine must NEVER auto-write the recommendation.

## Pricing model integration (next step)
The `Lead` type (`src/types/db.ts`) doesn't yet have structured EXW/volume/origin fields — they're free-text in `price_positioning` / `scale_note`. To wire `computePricing` into `generate-pitch.ts`, first add a Supabase migration adding columns: `exw_price numeric`, `exw_currency text`, `volume_cases integer`, `origin_country text`, `target_state_region text`, `wine_style text`, `vintage integer`, `packaging jsonb`. Update `Lead` type, `ApplicationForm.tsx`, and `validation.ts` accordingly. Then call `computePricing` in `generatePitchReport` after the research phase and inject the price walk into the `PitchContent`.

## Skills (`.claude/skills/`)
Six composable skills: `competitive-research`, `pricing-model`, `render-pdf`, `diagnostic`, `strategy`, `send-deliverable`. Load only when invoked. Paths assume this repo root as working directory.

## PDF rendering
The existing `src/lib/render-pdf.ts` uses Puppeteer-Core — use it for all PDF generation (not the system-Chrome workaround from the static prototype). The `generate-pdf.js` script in the static HTML prototype is NOT ported here.

## No public pricing
Never show price grids, rates, or retainer amounts on the public site. CTAs only ("Request a fit review", "Discuss an advisory engagement"). Pricing surfaces in proposals and discovery calls only.
