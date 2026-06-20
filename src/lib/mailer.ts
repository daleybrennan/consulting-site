import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Shared outbound mail transport (IONOS SMTP).
 *
 * Sends from `contact@daleybrennan.com` via smtp.ionos.com. Authenticates with
 * the mailbox address + password — a forwarding-only alias cannot send. Replies
 * land back in the mailbox (which forwards to iCloud), so no separate reply-to
 * is needed unless the caller wants replies routed elsewhere (e.g. to a prospect).
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** True only when every piece needed to send is present. */
export function isMailConfigured(): boolean {
  return Boolean(
    env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS') && env('SMTP_FROM')
  );
}

let cached: Transporter | null = null;

function getTransport(): Transporter {
  if (cached) return cached;
  const port = Number(env('SMTP_PORT') ?? '587');
  cached = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    // 465 = implicit TLS; 587 = STARTTLS upgrade.
    secure: port === 465,
    auth: {
      user: env('SMTP_USER'),
      pass: env('SMTP_PASS'),
    },
  });
  return cached;
}

/**
 * Send a message. Throws on failure — callers decide whether to swallow
 * (notifications) or surface (the deliverable send). Returns the message id.
 */
export async function sendMail(msg: MailMessage): Promise<string | undefined> {
  if (!isMailConfigured()) {
    throw new Error('mail_not_configured');
  }
  const info = await getTransport().sendMail({
    from: env('SMTP_FROM'),
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
    replyTo: msg.replyTo,
    attachments: msg.attachments,
  });
  return info.messageId;
}

/** Verify SMTP auth/connectivity without sending. Used by the test script. */
export async function verifyMail(): Promise<true> {
  await getTransport().verify();
  return true;
}
