import { NextResponse, after } from 'next/server';
import { leadSubmitSchema, toLeadRow, firstErrorKey } from '@/lib/validation';
import { verifyTurnstile } from '@/lib/turnstile';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { getServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { generatePitchReport } from '@/lib/generate-pitch';
import { notifyOwner } from '@/lib/notify';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // 1. Rate limit (each submit can trigger paid LLM work).
  const ip = clientIp(req);
  const limit = rateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'rate_limited', errorKey: 'rateLimited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } }
    );
  }

  // 2. Parse + validate.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_json', errorKey: 'generic' }, { status: 400 });
  }

  const parsed = leadSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid', errorKey: firstErrorKey(parsed.error) },
      { status: 422 }
    );
  }
  const input = parsed.data;

  // 3. Honeypot — pretend success, do nothing.
  if (input.company_url_hp) {
    return NextResponse.json({ ok: true });
  }

  // 4. Turnstile (no-op in dev when unconfigured).
  const human = await verifyTurnstile(input.turnstileToken, ip);
  if (!human) {
    return NextResponse.json(
      { error: 'captcha', errorKey: 'captcha' },
      { status: 400 }
    );
  }

  // 5. Persist + kick off generation.
  if (!isSupabaseConfigured()) {
    // Dev without Supabase: acknowledge so the form UX can be tested.
    console.warn('[leads/submit] Supabase not configured — lead not persisted.');
    return NextResponse.json({ ok: true, persisted: false });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('leads')
    .insert(toLeadRow(input))
    .select('id')
    .single<{ id: string }>();

  if (error || !data) {
    console.error('[leads/submit] insert failed', error);
    return NextResponse.json({ error: 'db', errorKey: 'generic' }, { status: 500 });
  }

  await notifyOwner('lead_created', {
    leadId: data.id,
    company: input.company_name,
  });
  await supabase.from('activity_log').insert({
    lead_id: data.id,
    type: 'lead_created',
    payload: { ip },
  });

  // 6. Generate the pitch after the response is sent.
  after(async () => {
    try {
      await generatePitchReport(data.id);
    } catch (err) {
      console.error('[leads/submit] background generation error', err);
    }
  });

  return NextResponse.json({ ok: true });
}
