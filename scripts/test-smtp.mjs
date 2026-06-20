/**
 * One-off IONOS SMTP check.
 *
 *   node scripts/test-smtp.mjs              # verify auth/connectivity only
 *   node scripts/test-smtp.mjs you@x.com    # verify, then send a test email
 *
 * Reads SMTP_* from .env.local. A successful verify() proves contact@ is a real
 * sendable mailbox (not just a forwarding alias).
 */
import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';

// Minimal .env.local loader (no dependency).
function loadEnv() {
  let raw;
  try {
    raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
const to = process.argv[2];

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
  console.error('✗ Missing SMTP_* in .env.local (need HOST, USER, PASS, FROM).');
  process.exit(1);
}

const port = Number(SMTP_PORT ?? '587');
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

try {
  await transporter.verify();
  console.log(`✓ SMTP auth OK — ${SMTP_USER} can send via ${SMTP_HOST}:${port}.`);
} catch (err) {
  console.error('✗ SMTP verify failed:', err.message);
  console.error('  → contact@ may be a forwarding alias, not a mailbox, or the password is wrong.');
  process.exit(1);
}

if (to) {
  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject: 'IONOS SMTP test — daleybrennan.com',
      text: 'This is a test message confirming outbound email works from contact@daleybrennan.com.',
    });
    console.log(`✓ Test email sent to ${to} (id: ${info.messageId}).`);
    console.log('  → Check it landed in the Inbox (not spam) and that SPF/DKIM pass.');
  } catch (err) {
    console.error('✗ Send failed:', err.message);
    process.exit(1);
  }
}
