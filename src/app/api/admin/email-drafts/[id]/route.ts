import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { getServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Save edits to subject/body → status 'edited'.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as {
    subject?: string;
    body?: string;
  } | null;
  if (!body) return NextResponse.json({ error: 'bad_json' }, { status: 400 });

  const update: Record<string, unknown> = { status: 'edited' };
  if (typeof body.subject === 'string') update.subject = body.subject.slice(0, 300);
  if (typeof body.body === 'string') update.body = body.body.slice(0, 20000);

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('email_drafts')
    .update(update)
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'db' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
