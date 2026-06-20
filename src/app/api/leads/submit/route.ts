import { NextResponse, after } from 'next/server';
import { leadSubmitSchema, toLeadRow, firstErrorKey } from '@/lib/validation';
import { verifyTurnstile } from '@/lib/turnstile';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { getServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { generatePitchReport } from '@/lib/generate-pitch';
import { notifyOwner } from '@/lib/notify';
import { sendMail, isMailConfigured } from '@/lib/mailer';
import { acknowledgmentEmail } from '@/lib/emails/acknowledgment';
import type { LeadSubmitInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Plain-text overview of a submission for the owner notification. */
function leadOverview(input: LeadSubmitInput): string {
  const lines: string[] = [];
  const add = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    lines.push(`${label}: ${value}`);
  };

  add('Name', [input.contact_name, input.contact_role && `(${input.contact_role})`]
    .filter(Boolean)
    .join(' '));
  add('Email', input.contact_email);
  add('Brand', [input.company_name, input.brand_category]
    .filter(Boolean)
    .join(' — '));
  add('Website', input.brand_website);
  add('Sells today', input.current_markets);
  add('Target', input.target_markets);
  add('Stage', input.stage);
  add('Distribution', input.current_distribution);
  add('Price positioning', input.price_positioning);
  add('Scale', input.scale_note);
  // Structured pricing fields (wine/spirits)
  add('Wines', input.wine_names);
  add('Style', input.wine_style);
  add('Vintage', input.vintage);
  add('Volume (cases)', input.volume_cases);
  add('EXW', input.exw_price && `${input.exw_price} ${input.exw_currency}`.trim());
  add('Origin', [input.origin_region, input.origin_country].filter(Boolean).join(', '));
  add('Target market', [input.target_country, input.target_region].filter(Boolean).join(' / '));
  add('Channel', input.channel);
  add('Tech sheet', input.tech_sheet_url);
  add('Notes', input.free_text);

  return lines.join('\n');
}

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

  await supabase.from('activity_log').insert({
    lead_id: data.id,
    type: 'lead_created',
    payload: { ip },
  });

  // 6. Notify the owner, acknowledge the submitter, and generate the pitch —
  //    all after the response is sent so the form returns instantly.
  after(async () => {
    // Owner alert (Telegram + email if configured); reply-to = the prospect.
    await notifyOwner('lead_created', {
      leadId: data.id,
      company: input.company_name,
      overview: leadOverview(input),
      replyTo: input.contact_email,
    });

    // Instant acknowledgment to the submitter — never let a mail failure
    // surface; the lead is already saved.
    if (isMailConfigured()) {
      try {
        const ack = acknowledgmentEmail({
          locale: input.locale,
          contactName: input.contact_name,
          companyName: input.company_name,
        });
        await sendMail({ to: input.contact_email, subject: ack.subject, text: ack.text });
      } catch (err) {
        console.error('[leads/submit] acknowledgment email error', err);
      }
    }

    try {
      await generatePitchReport(data.id);
    } catch (err) {
      console.error('[leads/submit] background generation error', err);
    }
  });

  return NextResponse.json({ ok: true });
}
