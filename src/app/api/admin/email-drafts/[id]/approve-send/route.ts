import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { getServiceClient } from '@/lib/supabase/server';
import { sendMail, isMailConfigured, mailBcc } from '@/lib/mailer';

export const runtime = 'nodejs';

/**
 * The single irreversible action: send the diagnostic to the lead with the
 * PDF attached, via IONOS SMTP from daley@daleybrennan.com. Replies forward
 * back to Daley's iCloud.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const supabase = getServiceClient();

  const { data: draft } = await supabase
    .from('email_drafts')
    .select('*')
    .eq('id', id)
    .single();
  if (!draft) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (draft.status === 'sent') {
    return NextResponse.json({ error: 'already_sent' }, { status: 409 });
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('id, contact_email, company_name')
    .eq('id', draft.lead_id)
    .single();
  const { data: report } = await supabase
    .from('reports')
    .select('pdf_storage_path')
    .eq('id', draft.report_id)
    .single();
  if (!lead || !report?.pdf_storage_path) {
    return NextResponse.json({ error: 'missing_pdf' }, { status: 400 });
  }

  // Download the PDF from private storage.
  const { data: file, error: dlErr } = await supabase.storage
    .from('reports')
    .download(report.pdf_storage_path);
  if (dlErr || !file) {
    return NextResponse.json({ error: 'pdf_download' }, { status: 500 });
  }
  const pdfBuffer = Buffer.from(await file.arrayBuffer());

  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: 'email_not_configured' },
      { status: 503 }
    );
  }

  const filename =
    draft.locale === 'fr'
      ? 'Diagnostic-commercial.pdf'
      : 'Commercial-diagnostic.pdf';

  try {
    const messageId = await sendMail({
      to: lead.contact_email,
      subject: draft.subject,
      text: draft.body,
      bcc: mailBcc(),
      attachments: [{ filename, content: pdfBuffer }],
    });

    await supabase
      .from('email_drafts')
      .update({
        status: 'sent',
        gmail_message_id: messageId ?? null,
        sent_at: new Date().toISOString(),
      })
      .eq('id', id);
    await supabase.from('leads').update({ status: 'sent' }).eq('id', lead.id);
    await supabase
      .from('reports')
      .update({ status: 'sent' })
      .eq('id', draft.report_id);
    await supabase.from('activity_log').insert({
      lead_id: lead.id,
      type: 'email_sent',
      payload: { draft_id: id, message_id: messageId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from('email_drafts')
      .update({ status: 'failed', error: message })
      .eq('id', id);
    return NextResponse.json({ error: 'send_failed', detail: message }, { status: 500 });
  }
}
