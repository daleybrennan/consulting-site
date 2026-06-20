import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { getServiceClient } from '@/lib/supabase/server';
import { pitchHtml } from '@/lib/pdf-template';
import type { Lead, PitchContent, Locale } from '@/types/db';

export const runtime = 'nodejs';

const PRINT_BAR = `<div class="no-print" style="background:#f6f3ea;border-bottom:1px solid #ddd6c6;padding:12px 24px;display:flex;align-items:center;gap:16px;font-family:system-ui,sans-serif;font-size:13px;color:#6b6458;">
  <button onclick="window.print()" style="background:#7c2433;color:#fff;border:none;border-radius:20px;padding:8px 20px;font-size:13px;cursor:pointer;font-family:inherit;">Print / Save as PDF</button>
  <span>In the print dialog, set Destination to <strong style="color:#0e0e10;">Save as PDF</strong>.</span>
</div>`;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Support token via query param for direct browser-tab navigation
  // (browsers can't send Authorization headers on link clicks).
  const url = new URL(req.url);
  const qToken = url.searchParams.get('t');
  const authHeader = qToken
    ? `Bearer ${qToken}`
    : (req.headers.get('authorization') ?? '');
  const fakeReq = new Request(req.url, { headers: { authorization: authHeader } });
  const auth = await requireAdmin(fakeReq);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const supabase = getServiceClient();

  const { data: report } = await supabase
    .from('reports')
    .select('generated_content, locale, lead_id, status')
    .eq('id', id)
    .single<{ generated_content: Record<string, PitchContent>; locale: Locale; lead_id: string; status: string }>();

  if (!report) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (report.status !== 'draft' && report.status !== 'pending_review' && report.status !== 'approved') {
    return NextResponse.json({ error: 'not_ready', status: report.status }, { status: 409 });
  }

  const content = report.generated_content?.[report.locale];
  if (!content) {
    return NextResponse.json({ error: 'no_content' }, { status: 404 });
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', report.lead_id)
    .single<Lead>();

  if (!lead) {
    return NextResponse.json({ error: 'lead_not_found' }, { status: 404 });
  }

  const html = pitchHtml(content, lead, report.locale);
  const withBar = html.replace('<body>', `<body>${PRINT_BAR}`);

  return new Response(withBar, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
