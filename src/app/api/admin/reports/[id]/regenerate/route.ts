import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { regeneratePitchReport } from '@/lib/generate-pitch';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { instructions?: string };
  const instructions = (body.instructions ?? '').trim();
  if (!instructions) {
    return NextResponse.json({ error: 'no_instructions' }, { status: 400 });
  }

  const result = await regeneratePitchReport(id, instructions);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, newReportId: result.newReportId });
}
