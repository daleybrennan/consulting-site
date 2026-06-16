---
name: pricing-model
description: Compute the EXW-to-shelf wine pricing walk for a target market (EXW, landed, front line, on/off-premise, quantity-discount legality). Use when modelling where a wine's price lands in a market, or when the diagnostic/strategy skills need numbers. Reads data/pricing-assumptions.json and accepts trade-data overrides.
---

# Pricing model

Wraps `scripts/pricing-model.js` — a zero-dependency Node engine that walks a wine's price from EXW to the shelf, route-selected by target market.

## Run it

Build a submission JSON, then run:

```bash
node scripts/pricing-model.js path/to/submission.json --json
```

`--json` appends the full structured result (use it — the orchestrators need the fields). Without a path it runs `--demo`.

Submission fields:
- `wineName`, `origin` — strings (labels only)
- `exwPrice` (number), `exwCurrency` — one of EUR/GBP/USD/CAD
- `targetMarket` — `US` | `UK` | `FR` | `CA`
- `targetRegion` — e.g. `NY` (US state drives excise + quantity-discount legality); optional
- `channel` — `on` | `off` | `both`
- `volumeCases` (number)
- `bottleMl` (default 750), `bottleCount` (default 12)

## What it returns

`band` (low/expected/high for frontline, on-premise list, off-premise shelf), `expected.perBottle` (every stop), `perCase`, `quantityDiscount` (legality + legal tiers), `assumptionsResolved`, and `warnings`. Every figure traces to `data/pricing-assumptions.json`.

## Trade-data overrides (important at $5k)

Defaults in `data/pricing-assumptions.json` are planning estimates. Before a paid strategy, replace them with the client's real numbers:
- **Live FX** → edit `fx.rates` + `fx.asOf`.
- **Real importer/distributor quotes** → edit the market's `importerMarginPctOnSell` / `distributorMarginPctOnSell`, or a freight quote → `freightPerCaseDefault`.
- **State excise / duty** → confirm against current schedules and edit the market block.

Make overrides as a copy or a clearly-noted edit, and record what changed so the appendix "Basis / source" column is honest. Always surface the `warnings` array to Daley.

## Quantity discounts

Legality comes from `data/quantity-discount-rules.json` (US is state-specific — `NY` = prohibited, `CA` = allowed, control states = n/a). Never present a discount structure as legal without this lookup; it is general guidance, not legal advice.
