-- Add structured pricing fields to leads for EXW→shelf model.
-- All columns are nullable — existing rows are unaffected, no backfill needed.

alter table leads
  add column if not exists origin_country  text,            -- e.g. "France"
  add column if not exists origin_region   text,            -- e.g. "Bordeaux"
  add column if not exists target_country  text,            -- market code: US / UK / FR / CA
  add column if not exists target_region   text,            -- US state or sub-region, e.g. "NY"
  add column if not exists wine_names      text,            -- comma-separated wine names
  add column if not exists wine_style      text,            -- style / varietal description
  add column if not exists vintage         integer,         -- vintage year, e.g. 2021
  add column if not exists volume_cases    integer,         -- annual volume in 12-bottle cases
  add column if not exists exw_price       numeric,         -- ex-cellar price per bottle
  add column if not exists exw_currency    text,            -- EUR / USD / GBP / CAD
  add column if not exists channel         text,            -- on / off / both
  add column if not exists tech_sheet_url  text;            -- optional tech-sheet link
