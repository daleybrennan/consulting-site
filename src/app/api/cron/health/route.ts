import { NextResponse } from 'next/server';
import { getServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { notifyOwner } from '@/lib/notify';

export const runtime = 'nodejs';

// How long a lead may sit unprocessed before it counts as neglected. The local
// worker runs every few minutes, so 30 min means "the worker has not picked this
// up" (machine off, or repeated failure) — worth a heads-up to Daley.
const NEGLECT_MIN = 30;

/**
 * Lightweight health sweep. Read-only + one alert; finishes well under the Vercel
 * 60s cap, so it is safe on Hobby (unlike generation itself). Intended to be
 * pinged by Supabase pg_cron (see supabase/sql/pitch-health-sweep.sql).
 *
 * It does NOT generate anything — that is the local worker's job. It only alerts
 * when leads have gone unprocessed too long (alert-only, per the agreed policy).
 */
async function handle(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (token !== secret) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const sb = getServiceClient();
  const cutoff = new Date(Date.now() - NEGLECT_MIN * 60_000).toISOString();

  const { data: neglected, error } = await sb
    .from('leads')
    .select('id, company_name, status, created_at')
    .in('status', ['new', 'researching'])
    .neq('brand_category', 'speaking')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) {
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }

  const count = neglected?.length ?? 0;
  if (count > 0) {
    const overview = neglected!
      .map((l) => `- ${l.company_name} (${l.status}, since ${l.created_at})`)
      .join('\n');
    await notifyOwner('worker_stalled', {
      leadId: neglected![0].id,
      company: count === 1 ? neglected![0].company_name : `${count} leads waiting`,
      overview: `Diagnostic generation has not completed for ${count} lead(s) older than ${NEGLECT_MIN} min. Is the local pitch worker running?\n\n${overview}`,
    });
  }

  return NextResponse.json({ ok: true, neglected: count });
}

export const GET = handle;
export const POST = handle;
