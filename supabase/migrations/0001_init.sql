-- ============================================================
-- Commercial Diagnostic Platform — initial schema
-- Conventions: uuid pk, created_at/updated_at, text + check (no enums),
-- locale-keyed jsonb, RLS on every table. Run in the Supabase SQL editor.
-- ============================================================

-- updated_at trigger helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------
-- leads — one row per application/form submission
-- ----------------------------------------------------------------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  locale text not null default 'en' check (locale in ('en','fr')),
  contact_name text not null,
  contact_email text not null,
  contact_role text,
  company_name text not null,
  brand_category text not null check (brand_category in ('wine','spirits','na_beverage','specialty_food','other')),
  brand_website text,
  current_markets text[] not null default '{}',
  target_markets text[] not null default '{}',
  stage text not null check (stage in ('pre_entry','expanding','underperforming')),
  current_distribution text,
  price_positioning text,
  scale_note text,
  free_text text not null,
  source text,
  consent boolean not null default false,
  status text not null default 'new'
    check (status in ('new','researching','pending_review','sent','scheduled_call','completed','archived'))
);

create trigger leads_updated_at before update on leads
  for each row execute function set_updated_at();
create index if not exists leads_status_idx on leads (status, created_at desc);
create index if not exists leads_email_idx on leads (contact_email);

-- ----------------------------------------------------------------
-- meetings — created now, used in a later phase (Cal.com)
-- ----------------------------------------------------------------
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  lead_id uuid references leads (id) on delete set null,
  cal_booking_id text,
  scheduled_at timestamptz,
  google_meet_url text,
  gemini_notes_drive_id text,
  gemini_notes_status text default 'awaiting'
    check (gemini_notes_status in ('awaiting','received','processed')),
  status text default 'booked'
    check (status in ('booked','completed','cancelled','no_show'))
);

create trigger meetings_updated_at before update on meetings
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------
-- reports — pitch (lead magnet) + product (post-call); one table
-- ----------------------------------------------------------------
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  lead_id uuid not null references leads (id) on delete cascade,
  type text not null check (type in ('pitch','product')),
  meeting_id uuid references meetings (id) on delete set null,
  locale text not null check (locale in ('en','fr')),
  version int not null default 1,
  status text not null default 'generating'
    check (status in ('generating','draft','pending_review','approved','sent','superseded','error')),
  generated_content jsonb,        -- locale-keyed { en: {...}, fr: {...} }
  research_sources jsonb,         -- citations
  consensus jsonb,                -- product only; unused this phase
  notes_source_ref text,          -- product only; unused this phase
  instructions text,              -- override notes that produced this version
  pdf_storage_path text,          -- key in the `reports` bucket
  generated_by text,              -- model id, for traceability
  error text
);

create trigger reports_updated_at before update on reports
  for each row execute function set_updated_at();
create index if not exists reports_lead_idx on reports (lead_id, created_at desc);

-- ----------------------------------------------------------------
-- email_drafts — the reply awaiting Daley's approval
-- ----------------------------------------------------------------
create table if not exists email_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  lead_id uuid not null references leads (id) on delete cascade,
  report_id uuid not null references reports (id) on delete cascade,
  locale text not null check (locale in ('en','fr')),
  subject text not null,
  body text not null,
  status text not null default 'draft'
    check (status in ('draft','edited','approved','sent','failed')),
  gmail_message_id text,          -- or Resend message id this phase
  sent_at timestamptz,
  error text
);

create trigger email_drafts_updated_at before update on email_drafts
  for each row execute function set_updated_at();
create index if not exists email_drafts_lead_idx on email_drafts (lead_id, created_at desc);

-- ----------------------------------------------------------------
-- activity_log — lightweight audit for the dashboard timeline
-- ----------------------------------------------------------------
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid references leads (id) on delete cascade,
  type text not null,
  payload jsonb
);

create index if not exists activity_log_lead_idx on activity_log (lead_id, created_at desc);

-- ============================================================
-- Row Level Security
-- The public never touches tables directly. All writes go through
-- server functions using the service role (which bypasses RLS).
-- Admin reads go through authenticated requests; only authenticated
-- users may select. No anon policies are created → anon is denied.
-- ============================================================
alter table leads          enable row level security;
alter table meetings       enable row level security;
alter table reports        enable row level security;
alter table email_drafts   enable row level security;
alter table activity_log   enable row level security;

-- Authenticated (admin) read access. Tighten to a specific email/role
-- in production if more than one user can authenticate.
create policy "authenticated read leads"        on leads        for select to authenticated using (true);
create policy "authenticated read meetings"     on meetings     for select to authenticated using (true);
create policy "authenticated read reports"      on reports      for select to authenticated using (true);
create policy "authenticated read drafts"       on email_drafts for select to authenticated using (true);
create policy "authenticated read activity"     on activity_log for select to authenticated using (true);

-- ============================================================
-- Storage: one private bucket for generated PDFs.
-- Paths: {type}/{lead_id}/{report_id}.pdf — fetched via signed URLs.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;
-- No storage policies for anon/authenticated → only the service role
-- (server) can read/write objects, via short-lived signed URLs.
