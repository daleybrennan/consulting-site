#!/usr/bin/env node
/**
 * Send a weekly prospecting digest to Daley, from and to his own
 * daley@daleybrennan.com mailbox, reusing the site's existing IONOS SMTP setup.
 *
 * This is self-notification, not outreach: the agent emails Daley a read-only
 * summary so he can triage from his phone, then acts in the IDE. It never emails
 * a prospect, so it sits outside the agent's hard never-send rule.
 *
 * Usage:
 *   node scripts/send-digest.mjs data/review/2026-06-20.md
 *
 * Reads SMTP_* from .env.local (same vars as src/lib/mailer.ts). Recipient is
 * DIGEST_TO, else OWNER_EMAIL / ADMIN_EMAIL (the owner's real inbox, as in
 * notify.ts), else daley@daleybrennan.com. It is sent FROM daley@daleybrennan.com
 * but never TO it - that mailbox forwards to iCloud, so self-addressing loops and
 * the forwarded copy fails SPF. Exits non-zero with a clear message if the mailbox
 * is not configured, so a scheduled run fails loudly rather than silently dropping.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/** Load .env.local into process.env without adding a dotenv dependency. */
function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
  } catch {
    return; // fall back to whatever is already in the environment
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function env(name) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/send-digest.mjs <path-to-review.md>');
    process.exit(2);
  }

  loadEnvLocal();

  if (!(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS') && env('SMTP_FROM'))) {
    console.error(
      'mail_not_configured: set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM in .env.local ' +
        '(same vars as the site mailer). Digest not sent.'
    );
    process.exit(1);
  }

  let body;
  try {
    body = readFileSync(resolve(ROOT, file), 'utf8');
  } catch (err) {
    console.error(`Could not read digest file: ${file}\n${err.message}`);
    process.exit(2);
  }

  // Deliver to the owner inbox, not back to the sending mailbox: daley@daleybrennan.com
  // forwards to iCloud, so addressing it to itself loops (451) and the forwarded copy
  // fails SPF and gets dropped. Mirror the site's working notify.ts path (OWNER_EMAIL).
  const to =
    env('DIGEST_TO') ?? env('OWNER_EMAIL') ?? env('ADMIN_EMAIL') ?? 'daley@daleybrennan.com';
  // Subject: first markdown heading if present, else the filename stem.
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const subject = heading || `Prospecting digest - ${basename(file).replace(/\.md$/, '')}`;

  const port = Number(env('SMTP_PORT') ?? '587');
  const transport = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    secure: port === 465, // 465 implicit TLS, 587 STARTTLS
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
  });

  const info = await transport.sendMail({
    from: env('SMTP_FROM'),
    to,
    subject,
    text: body,
  });
  console.log(`Digest sent to ${to} (messageId ${info.messageId})`);
}

main().catch((err) => {
  console.error(`Digest send failed: ${err.message}`);
  process.exit(1);
});
