/**
 * Local diagnostic-generation worker.
 *
 * Why this exists: on Vercel (Hobby = 60s hard cap) the multi-minute Opus
 * research + Chromium render is reliably killed mid-run, leaving the report stuck
 * at `generating` with no PDF and no error. So generation runs here instead, on a
 * machine with no time cap, driven off Supabase. Intended to run every few minutes
 * via Task Scheduler (windowless, see run-pending-pitches-silent.vbs).
 *
 * Each run:
 *   1. Claims `new` non-speaking leads and generates their pitch.
 *   2. Auto-resumes jobs that were KILLED mid-run (lead `researching`, latest
 *      report still `generating`, untouched for >STALE_MIN). This is the core fix.
 *   3. Leaves genuine FAILURES (latest report `error`) alone — generatePitchReport
 *      already alerted Daley; alert-only, no auto-retry.
 *
 * Run:  npx tsx scripts/run-pending-pitches.ts
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STALE_MIN = 15; // a `generating` job older than this is treated as killed
const BATCH = 20;

/** Load .env.local into process.env (without overriding anything already set).
 *  Must run before importing app modules that read env at top level. */
function loadEnv(): void {
  let raw: string;
  try {
    raw = readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  } catch {
    return; // rely on ambient env (e.g. CI)
  }
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnv();

// Never let the render path think it is on Vercel (that branch needs
// @sparticuz/chromium, which is not installed locally — bundled puppeteer is).
const env = process.env as Record<string, string | undefined>;
delete env.VERCEL;
if (env.NODE_ENV === 'production') env.NODE_ENV = 'development';

type LeadRow = { id: string; company_name: string; brand_category: string };

async function main(): Promise<void> {
  // Dynamic imports AFTER env is loaded, so modules with top-level env reads
  // (notify.ts SITE_URL, mailer.ts) see the right values. Kept inside main() so
  // the file has no top-level await (tsx emits CJS here).
  const { getServiceClient } = await import('@/lib/supabase/server');
  const { generatePitchReport } = await import('@/lib/generate-pitch');

  const sb = getServiceClient();
  const staleCutoff = new Date(Date.now() - STALE_MIN * 60_000).toISOString();
  let generated = 0;

  // 1. Fresh leads waiting for a first pass.
  const { data: fresh, error: freshErr } = await sb
    .from('leads')
    .select('id, company_name, brand_category')
    .eq('status', 'new')
    .neq('brand_category', 'speaking')
    .order('created_at', { ascending: true })
    .limit(BATCH);
  if (freshErr) throw freshErr;

  for (const lead of (fresh ?? []) as LeadRow[]) {
    // Claim atomically so an overlapping tick cannot double-generate.
    const { data: claimed } = await sb
      .from('leads')
      .update({ status: 'researching' })
      .eq('id', lead.id)
      .eq('status', 'new')
      .select('id');
    if (!claimed?.length) continue; // lost the race
    console.log(`[worker] generating (new): ${lead.company_name} ${lead.id}`);
    await generatePitchReport(lead.id);
    generated++;
  }

  // 2. Killed-mid-run jobs: lead `researching`, untouched for a while, whose
  //    latest report is still `generating` (NOT `error` — that is a real failure
  //    we leave for manual re-run, the alert already went out).
  const { data: stalled, error: stalledErr } = await sb
    .from('leads')
    .select('id, company_name, brand_category')
    .eq('status', 'researching')
    .neq('brand_category', 'speaking')
    .lt('updated_at', staleCutoff)
    .limit(BATCH);
  if (stalledErr) throw stalledErr;

  for (const lead of (stalled ?? []) as LeadRow[]) {
    const { data: reports } = await sb
      .from('reports')
      .select('id, status, created_at')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const latest = reports?.[0];
    if (latest && latest.status !== 'generating') continue; // failed or already done

    // Re-lease (guarded) so a concurrent tick won't also grab it.
    const { data: leased } = await sb
      .from('leads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', lead.id)
      .eq('status', 'researching')
      .lt('updated_at', staleCutoff)
      .select('id');
    if (!leased?.length) continue;

    // Retire the orphaned `generating` row so it doesn't linger in admin; a fresh
    // report is created by generatePitchReport.
    if (latest?.id) {
      await sb.from('reports').update({ status: 'superseded' }).eq('id', latest.id);
    }
    console.log(`[worker] resuming (killed): ${lead.company_name} ${lead.id}`);
    await generatePitchReport(lead.id);
    generated++;
  }

  console.log(`[worker] done. generated=${generated}`);
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
