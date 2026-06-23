-- First-time-exporter support.
-- 1) Add a market-agnostic 'exploring' stage so producers who have not yet
--    chosen a market are not forced into a US framing.
-- 2) Add a domestic shelf price (+ currency) so the diagnostic can work back to
--    an approximate ex-cellar price when the producer does not know their EXW.
-- All additive / nullable: existing rows are unaffected, no backfill needed.

alter table public.leads
  drop constraint if exists leads_stage_check;

alter table public.leads
  add constraint leads_stage_check
  check (stage in ('pre_entry', 'expanding', 'underperforming', 'exploring'));

alter table public.leads
  add column if not exists domestic_price    numeric,   -- approx. domestic shelf price per bottle
  add column if not exists domestic_currency text;       -- EUR / USD / GBP / CAD
