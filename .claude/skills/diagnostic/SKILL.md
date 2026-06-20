---
name: diagnostic
description: Produce the free Pricing Diagnostic PDF from a wine producer's intake submission — the lead magnet that shows the price walk and competitive set and NAMES the pricing problem, while withholding the recommended strategy. Use when a new pricing-diagnostic enquiry comes in or Daley says "run the diagnostic".
---

# Diagnostic orchestrator (free deliverable)

Thin orchestrator. It turns one intake submission into a brand-matched diagnostic PDF for Daley to review and send. It composes three capability skills — it holds little logic of its own.

## The hard rule
The diagnostic **names the problem and shows the numbers. It must NOT contain the recommendation** (the recommended EXW/price architecture, channel sequence, accounts, discount play). That is the paid product. The close is an *invitation* to commission the strategy, never advice. This protects Daley's IP and is the commercial hook.

## Voice & tone

Every sentence in the PDF is addressed to the client (the wine producer). Write as a senior advisor writing to a business counterpart — not as an LLM reporting on its own process or leaving notes for Daley.

**No LLM-speak.** Phrases like "could not be verified in this session", "will not be asserted", "as of this analysis", or "in this session" must not appear. When data cannot be confirmed, state it as a professional advisory note to the client:
- ✓ "Import duty and tariff rates are subject to revision; verify the current schedule before finalising your cost model."
- ✗ "Tariffs could not be verified in this session and will not be asserted."

**Prose standard**: Concise and precise. No trade argot, no informal evaluative phrases ("a prestige scalp", "a great buy"). One clear idea per sentence.

**Regulatory bodies**: Name the correct authority for the jurisdiction — never use "ABC" as a generic abbreviation. New York's authority is the State Liquor Authority (NYSLA/SLA).

**Questions sections**: The heading is "QUESTIONS WORTH ANSWERING" — nothing after that. Any questions must be framed as prompts to the client (what the producer should be asking themselves before entering the market), not as a task list or an internal agenda.

## Steps

1. **Get the submission.** Either Daley pastes it, or pull the latest from the intake form email:
   - Use the Gmail tools (`search_threads` for subject `New Pricing Diagnostic request`, then `get_thread`) and parse the fields: winery, contact name + email, origin, target country + region, wine, style, vintage, packaging, volume_cases, exw_price + currency, channel, distribution status, positioning, notes, preferred_language.
   - Map to a submission JSON for the model.

2. **Run the numbers** — use the `pricing-model` skill. Save the submission JSON, run with `--json`, keep the `band`, `expected.perBottle`, `perCase`, `quantityDiscount`, `warnings`.

3. **Research the set** — use the `competitive-research` skill for the wine in the target market/region. Get 6–12 comparables with sourced prices and the band.

4. **Write the gap.** State factually where the wine lands vs. the set (e.g. "top of the band, little room above the comparables", or "margin compresses below viability at the front line"). Pose the strategic question — do **not** answer it.

5. **Render** — use the `render-pdf` skill with `templates/diagnostic.html`. Fill `{{TOKENS}}` and `SLOT:` regions (situation, brief recap, walk-rows, band, competitive-rows, the-gap, regulation). Output `out/<client-slug>-diagnostic.pdf`.

6. **Hand to Daley.** Summarise: the expected shelf, the band, the headline gap, the quantity-discount status, and any model `warnings` to verify. Offer to draft the covering email (see the `strategy`/send step / Gmail `create_draft`).

## Language
If `preferred_language` is `fr`, produce the diagnostic in French (the brand is bilingual). Otherwise English.

## Quality gates before handing back
- No recommendation leaked into the diagnostic.
- No stray `{{TOKENS}}` in the PDF.
- Every competitive price is sourced; model `warnings` surfaced to Daley.
- If preferred language is French, the document is in French.
