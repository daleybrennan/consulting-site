import { sendMail, isMailConfigured } from '@/lib/mailer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

type NotifyType = 'lead_created' | 'pitch_generated' | 'pitch_error';

/**
 * Emails the owner. Non-throwing — a failed notification must never break the
 * pipeline. Recipient is OWNER_EMAIL, falling back to ADMIN_EMAIL.
 */
async function sendOwnerEmail(
  subject: string,
  body: string,
  replyTo?: string
): Promise<boolean> {
  const to = process.env.OWNER_EMAIL ?? process.env.ADMIN_EMAIL;
  if (!to || !isMailConfigured()) return false;
  try {
    await sendMail({ to, subject, text: body, replyTo });
    return true;
  } catch (err) {
    console.error('[notifyOwner] email send error:', err);
    return false;
  }
}

/**
 * Sends a plain-text message to the owner's Telegram chat. Non-throwing.
 * No parse_mode — keep it plain text so brand names / notes need no escaping.
 */
async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
      }
    );
    if (!res.ok) {
      console.error('[notifyOwner] Telegram send failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[notifyOwner] Telegram send error:', err);
    return false;
  }
}

/**
 * Owner alert. Sends via Telegram if configured; otherwise logs.
 * Non-throwing — a failed notification must never break the pipeline.
 */
export async function notifyOwner(
  type: NotifyType,
  ref: {
    leadId: string;
    company?: string;
    detail?: string;
    overview?: string;
    replyTo?: string;
  }
): Promise<void> {
  const reviewUrl = `${SITE_URL}/en/admin/leads/${ref.leadId}`;
  const subjects: Record<NotifyType, string> = {
    lead_created: `New application — ${ref.company ?? 'unknown brand'}`,
    pitch_generated: `Pitch ready for review — ${ref.company ?? ''}`.trim(),
    pitch_error: `Pitch generation failed — ${ref.company ?? ''}`.trim(),
  };

  const body = [ref.overview ?? ref.detail ?? '', `Review: ${reviewUrl}`]
    .filter(Boolean)
    .join('\n\n');
  const line = [subjects[type], body].filter(Boolean).join('\n\n');

  // Telegram + email run independently; either being unconfigured is fine.
  const [telegramSent, emailSent] = await Promise.all([
    sendTelegram(line),
    sendOwnerEmail(subjects[type], body, ref.replyTo),
  ]);
  if (!telegramSent && !emailSent) {
    console.log(`[notifyOwner:${type}] ${line}`);
  }
}
