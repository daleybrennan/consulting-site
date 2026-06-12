import { Resend } from 'resend';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

type NotifyType = 'lead_created' | 'pitch_generated' | 'pitch_error';

/**
 * Owner alert. Sends an email via Resend if configured; otherwise logs.
 * Non-throwing — a failed notification must never break the pipeline.
 */
export async function notifyOwner(
  type: NotifyType,
  ref: { leadId: string; company?: string; detail?: string }
): Promise<void> {
  const reviewUrl = `${SITE_URL}/en/admin/leads/${ref.leadId}`;
  const subjects: Record<NotifyType, string> = {
    lead_created: `New application — ${ref.company ?? 'unknown brand'}`,
    pitch_generated: `Pitch ready for review — ${ref.company ?? ''}`.trim(),
    pitch_error: `Pitch generation failed — ${ref.company ?? ''}`.trim(),
  };
  const line = `${subjects[type]}\n${ref.detail ?? ''}\nReview: ${reviewUrl}`;

  const key = process.env.RESEND_API_KEY;
  const to = process.env.OWNER_EMAIL;
  const from = process.env.RESEND_FROM;

  if (!key || !to || !from) {
    console.log(`[notifyOwner:${type}] ${line}`);
    return;
  }

  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from,
      to,
      subject: subjects[type],
      text: line,
    });
  } catch (err) {
    console.error('[notifyOwner] send failed:', err);
    console.log(`[notifyOwner:${type}] ${line}`);
  }
}
