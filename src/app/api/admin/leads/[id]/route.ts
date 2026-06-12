import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { getServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const supabase = getServiceClient();

  const [{ data: lead }, { data: reports }, { data: drafts }, { data: activity }] =
    await Promise.all([
      supabase.from('leads').select('*').eq('id', id).single(),
      supabase
        .from('reports')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('email_drafts')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('activity_log')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false }),
    ]);

  if (!lead) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Signed URL for the most recent report that has a PDF.
  let pdfUrl: string | null = null;
  const latestWithPdf = (reports ?? []).find((r) => r.pdf_storage_path);
  if (latestWithPdf?.pdf_storage_path) {
    const { data: signed } = await supabase.storage
      .from('reports')
      .createSignedUrl(latestWithPdf.pdf_storage_path, 60 * 10);
    pdfUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json({
    lead,
    reports: reports ?? [],
    drafts: drafts ?? [],
    activity: activity ?? [],
    pdfUrl,
  });
}
