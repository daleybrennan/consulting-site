-- Diagnostic worker health sweep (Supabase pg_cron + pg_net).
--
-- Pings the secured /api/cron/health endpoint every 10 minutes. That endpoint is
-- read-only and alert-only: it does NOT generate diagnostics (generation runs in
-- the local worker, off Vercel, because Hobby caps functions at 60s). It just
-- emails/Telegrams Daley when a lead has sat unprocessed too long, i.e. the local
-- worker is not running.
--
-- This is operational setup, not a schema migration. Run it ONCE in the Supabase
-- SQL editor (or via the Supabase MCP) against the linked project. It is kept out
-- of supabase/migrations so the secret is never committed.
--
-- Prerequisites:
--   * Vercel env CRON_SECRET set to a strong random string (same value used below).
--   * Extensions pg_cron and pg_net enabled (Dashboard > Database > Extensions).

-- 1. Enable extensions (no-op if already on).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Store the endpoint URL and shared secret in Vault (do NOT hardcode the secret
--    in SQL you commit). Replace the placeholder values, run once.
select vault.create_secret(
  'https://www.daleybrennan.com/api/cron/health',  -- <-- your deployed URL
  'pitch_health_url'
);
select vault.create_secret(
  'REPLACE_WITH_CRON_SECRET',                       -- <-- same as Vercel CRON_SECRET
  'pitch_cron_secret'
);

-- 3. Schedule the sweep every 10 minutes. Reads URL + secret from Vault at run time.
select cron.schedule(
  'pitch-health-sweep',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'pitch_health_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'pitch_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Inspect:  select * from cron.job;
--           select * from cron.job_run_details order by start_time desc limit 10;
-- Remove:   select cron.unschedule('pitch-health-sweep');
