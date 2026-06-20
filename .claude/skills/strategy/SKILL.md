---
name: strategy
description: Produce the paid ($5,000) Market-Entry Pricing Strategy PDF for a wine producer — deep competitive + regulatory analysis, current-vs-recommended price architecture, with the recommendation left as clearly-marked slots for Daley to complete. Use when a client has commissioned the strategy after the diagnostic.
---

# Strategy orchestrator (the $5,000 product)

Builds the full paid deliverable on the same engine as the diagnostic, but deeper — and it stops at the edge of Daley's judgement.

## The hard rule
**The machine never writes the recommendation.** Fill the analysis (numbers, competitive set, legality, current price architecture) and the `SLOT:` content regions. **Leave every `.slot` block ("★ Daley —") untouched** — those are Daley's: the recommended EXW, channel sequence, target accounts, discount play, and 12-month plan. If you are unsure whether something is analysis or recommendation, treat it as recommendation and leave it for Daley.

## Voice & tone

Every sentence in the PDF is addressed to the client (the wine producer). Write as a senior advisor writing to a business counterpart — not as an LLM reporting on its own process or leaving notes for Daley.

**No LLM-speak.** Phrases like "could not be verified in this session", "will not be asserted", "as of this analysis", or "in this session" must not appear. When data cannot be confirmed, state it as a professional advisory note to the client:
- ✓ "Import duty and tariff rates are subject to revision; verify the current schedule before finalising your cost model."
- ✗ "Tariffs could not be verified in this session and will not be asserted."

**Prose standard**: Concise and precise. No trade argot, no informal evaluative phrases ("a prestige scalp", "a great buy"). One clear idea per sentence.

**Regulatory bodies**: Name the correct authority for the jurisdiction — never use "ABC" as a generic abbreviation. New York's authority is the State Liquor Authority (NYSLA/SLA).

**Questions sections**: The heading is "QUESTIONS WORTH ANSWERING" — nothing after that. Any questions must be framed as prompts to the client (what the producer should be asking themselves before entering the market), not as a task list or an internal agenda.

## Steps

1. **Submission + diagnostic context.** Start from the intake submission (and the diagnostic if one was produced). Confirm the brief and objectives.

2. **Trade-data overrides FIRST.** Ask Daley for / accept any real trade data: live FX, importer/distributor quotes, freight quote, confirmed duty/excise. Apply them via the `pricing-model` skill's override path (edit `data/pricing-assumptions.json` or a noted copy) and record what changed for the appendix "Basis / source" column. Do not ship default assumptions in a paid document without flagging them.

3. **Run the numbers — current.** Use `pricing-model` for today's EXW. Keep all stops + band + `quantityDiscount` + `warnings`.

4. **Run the numbers — recommended (optional input).** When Daley supplies a recommended EXW (his call), re-run the model with it to fill the "Recommended" column of the price architecture. Until he does, leave `{{REC_*}}` for him.

5. **Research deeply** — `competitive-research` for a precise set with off- AND on-premise prices, importers/distributors, and sources for the appendix.

6. **Regulatory** — pull the quantity-discount legality (`data/quantity-discount-rules.json`) for the market/state and state it plainly; flag where a discount is prohibited (e.g. New York, where the NYSLA prohibits volume discounts under the three-tier system) so Daley's slot addresses compliant alternatives.

7. **Render** — `render-pdf` skill with `templates/strategy.html` → `out/<client-slug>-strategy.pdf`. Fill `SLOT:` analysis regions and `{{TOKENS}}`; **leave `.slot` recommendation blocks for Daley.**

8. **Hand to Daley with a checklist** of exactly which slots need his input (the call, objectives, recommended EXW + why, channel sequence, target accounts, discount play, 12-month plan), plus all `warnings` and unverified numbers.

## After Daley fills the slots
Re-render to produce the final signed-off PDF, then proceed to the send step (Gmail draft).

## Quality gates
- Recommendation slots left for Daley (never auto-filled).
- Trade-data overrides applied or every default explicitly flagged.
- Appendix "Basis / source" honest for every number.
- Competitive prices sourced; `warnings` surfaced.
- French output if `preferred_language` is `fr`.
