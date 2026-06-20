-- Speaking / training inquiry type.
-- Allows brand_category = 'speaking', relaxes the NOT NULL on stage (speaking
-- inquiries have no US-entry stage), and adds optional engagement fields.

alter table public.leads
  drop constraint if exists leads_brand_category_check;

alter table public.leads
  add constraint leads_brand_category_check
  check (brand_category in (
    'wine', 'spirits', 'na_beverage', 'specialty_food', 'other', 'speaking'
  ));

alter table public.leads
  alter column stage drop not null;

alter table public.leads add column if not exists event_type      text;
alter table public.leads add column if not exists event_audience  text;
alter table public.leads add column if not exists event_timeframe text;
alter table public.leads add column if not exists event_format    text;
