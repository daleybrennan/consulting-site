/**
 * EXW → shelf pricing engine.
 * Walks: EXW → CIF → LANDED → IMPORTER-OUT → FRONT LINE → ON/OFF-PREMISE.
 * Route-selected by target market (US / UK / FR / CA). All assumptions are
 * overridable; every number traces to src/data/pricing-assumptions.json.
 */

import assumptionsRaw from '@/data/pricing-assumptions.json';
import qdRulesRaw from '@/data/quantity-discount-rules.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const assumptions = assumptionsRaw as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const qdRules = qdRulesRaw as any;

// ── types ─────────────────────────────────────────────────────────

/** Per-market assumption shape (subset of pricing-assumptions.json actually read). */
interface MarketAssumptions {
  label: string;
  currency: string;
  model: string;
  freightPerCaseDefault: number;
  insurancePctOfGoods?: number;
  isControlMarket?: boolean;
  boardMarkupPctOnLanded?: number;
  boardMarkupNote?: string;
  importerMarginPctOnSell?: number;
  distributorMarginPctOnSell?: number;
  offPremiseMarginPctOnSell?: number;
  onPremiseMultiplier?: number;
  duty?: { perBottle750ml?: number; perLitre?: number };
  excise?: {
    perBottle750ml?: number;
    federalPerLitre?: number;
    perLitre?: number;
    stateExcisePerLitreExamples?: Record<string, number>;
  };
  consumerTax?: { pct?: number; examplePct?: Record<string, number> };
}

export interface PricingSubmission {
  wineName?: string;
  origin?: string;
  exwPrice: number;
  exwCurrency: 'EUR' | 'USD' | 'GBP' | 'CAD';
  targetMarket: 'US' | 'UK' | 'FR' | 'CA';
  targetRegion?: string;
  channel?: 'on' | 'off' | 'both';
  volumeCases?: number;
  bottleMl?: number;
  bottleCount?: number;
}

export interface BottlePrices {
  exw: number;
  freight: number;
  insurance: number;
  cif: number;
  duty: number;
  excise: number;
  landed: number;
  importerOut: number;
  frontline: number;
  onPremiseList: number;
  offPremiseShelfPreTax: number;
  offPremiseShelfInclTax: number;
}

export interface WalkResult {
  bottleMl: number;
  bottleCount: number;
  perBottle: BottlePrices;
  consumerTaxPct: number;
  structureNote: string;
}

export interface PricingBand {
  low: number;
  expected: number;
  high: number;
}

export interface PricingResult {
  generatedAt: string;
  inputs: PricingSubmission & { marketCode: string; region: string | null };
  market: { code: string; label: string; currency: string; model: string };
  band: { currency: string; frontline: PricingBand; onPremiseList: PricingBand; offPremiseShelf: PricingBand };
  expected: WalkResult;
  perCase: { bottleCount: number; exw: number; landed: number; frontline: number };
  quantityDiscount: { legal: string; stateType?: string | null; note?: string; federalNote?: string; tiers: { discountPct: number; netFrontlinePerBottle: number }[] };
  assumptionsResolved: Record<string, unknown>;
  warnings: string[];
  disclaimer: string;
}

// ── helpers ───────────────────────────────────────────────────────

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', CAD: 'C$', EUR: '€', GBP: '£' };
const round = (n: number, d = 2) => Math.round((n + Number.EPSILON) * 10 ** d) / 10 ** d;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function money(n: number | null | undefined, cur: string): string {
  if (n == null || isNaN(n)) return '-';
  return (CURRENCY_SYMBOL[cur] || '') + round(n, 2).toFixed(2);
}

function fxRate(from: string, to: string): number {
  if (from === to) return 1;
  const table = assumptions.fx.rates[from];
  if (table && table[to] != null) return table[to];
  const inv = assumptions.fx.rates[to];
  if (inv && inv[from]) return round(1 / inv[from], 6);
  throw new Error(`No FX rate ${from}->${to}. Add it to src/data/pricing-assumptions.json fx.rates.`);
}

function dutyPerBottle(market: MarketAssumptions, bottleMl: number): number {
  const d = market.duty || {};
  if (d.perBottle750ml != null) return d.perBottle750ml * (bottleMl / 750);
  if (d.perLitre != null) return d.perLitre * (bottleMl / 1000);
  return 0;
}

function excisePerBottle(market: MarketAssumptions, bottleMl: number, region: string | null): number {
  const e = market.excise || {};
  let total = 0;
  if (e.perBottle750ml != null) total += e.perBottle750ml * (bottleMl / 750);
  if (e.federalPerLitre != null) total += e.federalPerLitre * (bottleMl / 1000);
  if (e.perLitre != null) total += e.perLitre * (bottleMl / 1000);
  if (region && e.stateExcisePerLitreExamples?.[region] != null) {
    total += e.stateExcisePerLitreExamples[region] * (bottleMl / 1000);
  }
  return total;
}

function consumerTaxPct(market: MarketAssumptions, region: string | null): number {
  const c = market.consumerTax;
  if (!c) return 0;
  if (c.pct != null) return c.pct;
  if (c.examplePct && region && c.examplePct[region] != null) return c.examplePct[region];
  if (c.examplePct) return Object.values(c.examplePct)[0] as number;
  return 0;
}

// ── core walk for one scenario ────────────────────────────────────

function walk(
  sub: PricingSubmission,
  market: MarketAssumptions,
  region: string | null,
  scenario: { marginDelta: number; freightFactor: number }
): WalkResult {
  const bottleMl    = sub.bottleMl    ?? assumptions.defaultCase.bottleMl;
  const bottleCount = sub.bottleCount ?? assumptions.defaultCase.bottleCount;

  const fx        = fxRate(sub.exwCurrency, market.currency);
  const exw       = sub.exwPrice * fx;
  const freightPB = (market.freightPerCaseDefault * scenario.freightFactor) / bottleCount;
  const insurance = exw * (market.insurancePctOfGoods ?? assumptions.defaults.insurancePctOfGoods);
  const cif       = exw + freightPB + insurance;

  const duty   = dutyPerBottle(market, bottleMl);
  const excise = excisePerBottle(market, bottleMl, region);
  const landed = cif + duty + excise;

  let importerOut: number, frontline: number, structureNote: string;
  if (market.isControlMarket) {
    importerOut   = landed;
    frontline     = landed * (1 + (market.boardMarkupPctOnLanded || 0));
    structureNote = 'Control market: provincial board ad valorem markup applied to landed cost in lieu of importer/distributor margins.';
  } else {
    const impM = clamp((market.importerMarginPctOnSell ?? assumptions.defaults.importerMarginPctOnSell) + scenario.marginDelta, 0.05, 0.6);
    const disM = clamp((market.distributorMarginPctOnSell ?? assumptions.defaults.distributorMarginPctOnSell) + scenario.marginDelta, 0, 0.6);
    importerOut   = landed / (1 - impM);
    frontline     = disM > 0 ? importerOut / (1 - disM) : importerOut;
    structureNote = `Importer margin ${(impM * 100).toFixed(0)}% then distributor margin ${(disM * 100).toFixed(0)}% (margin on each tier's own sell price).`;
  }

  const offM = clamp((market.offPremiseMarginPctOnSell ?? assumptions.defaults.offPremiseMarginPctOnSell) + scenario.marginDelta, 0.05, 0.6);
  const offPremiseShelfPreTax  = market.isControlMarket ? frontline : frontline / (1 - offM);
  const onMult = market.onPremiseMultiplier ?? assumptions.defaults.onPremiseMultiplier;
  const onPremiseList = frontline * onMult;

  const taxPct = consumerTaxPct(market, region);
  const offPremiseShelfInclTax = offPremiseShelfPreTax * (1 + taxPct);

  return {
    bottleMl, bottleCount,
    perBottle: {
      exw: round(exw), freight: round(freightPB), insurance: round(insurance), cif: round(cif),
      duty: round(duty), excise: round(excise), landed: round(landed),
      importerOut: round(importerOut), frontline: round(frontline),
      onPremiseList: round(onPremiseList),
      offPremiseShelfPreTax: round(offPremiseShelfPreTax),
      offPremiseShelfInclTax: round(offPremiseShelfInclTax),
    },
    consumerTaxPct: taxPct,
    structureNote,
  };
}

// ── quantity-discount legality lookup ─────────────────────────────

export function quantityDiscount(marketCode: string, region: string | null) {
  const m = qdRules.markets[marketCode];
  if (!m) return { legal: 'unknown', note: 'Market not in rules table, verify locally.' };
  if (m.model === 'three-tier') {
    const st = (region && m.states[region]) || m.defaultIfStateUnlisted;
    return {
      legal: st.quantityDiscountToRetailer,
      stateType: st.type || null,
      note: st.note || m.federalNote,
      federalNote: m.federalNote,
    };
  }
  return { legal: m.quantityDiscountToRetailer, note: m.note };
}

// ── public entry point ────────────────────────────────────────────

export function computePricing(sub: PricingSubmission): PricingResult {
  const marketCode = sub.targetMarket.toUpperCase();
  const market = assumptions.markets[marketCode];
  const warnings: string[] = [];

  if (!market) {
    throw new Error(`Unknown target market "${sub.targetMarket}". Known: ${Object.keys(assumptions.markets).join(', ')}.`);
  }

  const region = sub.targetRegion ? sub.targetRegion.toUpperCase() : null;

  if (sub.exwCurrency !== market.currency) {
    warnings.push(`FX ${sub.exwCurrency}->${market.currency} = ${fxRate(sub.exwCurrency, market.currency)} is an INDICATIVE rate (fx.asOf ${assumptions.fx.asOf}). Refresh before sign-off.`);
  }
  if (market.isControlMarket) warnings.push(market.boardMarkupNote);
  if (marketCode === 'US' && region && market.consumerTax?.examplePct?.[region] == null) {
    warnings.push(`No state sales-tax example for ${region}; consumer tax shown is representative.`);
  }

  const expected = walk(sub, market, region, { marginDelta: 0,     freightFactor: 1.0 });
  const low      = walk(sub, market, region, { marginDelta: -0.05, freightFactor: 0.8 });
  const high     = walk(sub, market, region, { marginDelta: 0.05,  freightFactor: 1.2 });

  const qd = quantityDiscount(marketCode, region);
  const qdTiers: { discountPct: number; netFrontlinePerBottle: number }[] = [];
  if (qd.legal === 'allowed') {
    [5, 10, 15].forEach(pct => {
      qdTiers.push({ discountPct: pct, netFrontlinePerBottle: round(expected.perBottle.frontline * (1 - pct / 100)) });
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    inputs: { ...sub, marketCode, region },
    market: { code: marketCode, label: market.label, currency: market.currency, model: market.model },
    band: {
      currency: market.currency,
      frontline:       { low: low.perBottle.frontline,              expected: expected.perBottle.frontline,              high: high.perBottle.frontline },
      onPremiseList:   { low: low.perBottle.onPremiseList,          expected: expected.perBottle.onPremiseList,          high: high.perBottle.onPremiseList },
      offPremiseShelf: { low: low.perBottle.offPremiseShelfInclTax, expected: expected.perBottle.offPremiseShelfInclTax, high: high.perBottle.offPremiseShelfInclTax },
    },
    expected,
    perCase: {
      bottleCount: expected.bottleCount,
      exw:       round(expected.perBottle.exw       * expected.bottleCount),
      landed:    round(expected.perBottle.landed    * expected.bottleCount),
      frontline: round(expected.perBottle.frontline * expected.bottleCount),
    },
    quantityDiscount: { ...qd, tiers: qdTiers },
    assumptionsResolved: {
      fxAsOf:                       assumptions.fx.asOf,
      freightPerCase:               market.freightPerCaseDefault,
      importerMarginPctOnSell:      market.importerMarginPctOnSell,
      distributorMarginPctOnSell:   market.distributorMarginPctOnSell,
      offPremiseMarginPctOnSell:    market.offPremiseMarginPctOnSell,
      onPremiseMultiplier:          market.onPremiseMultiplier,
      duty:                         market.duty,
      excise:                       market.excise,
      boardMarkupPctOnLanded:       market.boardMarkupPctOnLanded,
    },
    warnings,
    disclaimer: assumptions._meta.disclaimer,
  };
}
