# Commercial Diagnostic Platform

Bilingual (EN/FR) marketing site + AI lead pipeline for Daley Brennan — commercial
strategy for premium wine & spirits brands. Next.js (App Router) · Supabase ·
Claude. This is **Foundation Phase 1**: the site, the application intake, the
teaser "pitch" diagnostic pipeline, and the admin review dashboard. Cal.com, the
full "product" diagnostic with consensus, and Gmail-native sending are later phases.

## Quick start

```bash
cp .env.local.example .env.local   # fill in keys (see below)
npm install
npm run dev                         # http://localhost:3000 → redirects to /en
```

The site (all 5 pages, both locales, SEO) runs with no keys at all. To exercise
the lead → pitch pipeline you need Supabase + an Anthropic key.

## Setup

1. **Anthropic** — put your key in `ANTHROPIC_API_KEY`.
2. **Supabase** (free tier):
   - Create a project.
   - SQL editor → paste & run `supabase/migrations/0001_init.sql` (creates the 5
     tables, RLS, and the private `reports` storage bucket).
   - Authentication → Users → add yourself (email + password) for the admin.
   - Project settings → API → copy the URL, the `anon` key, and the
     `service_role` key into `.env.local`. Set `ADMIN_EMAIL` to your email.
3. **Optional**: Cloudflare Turnstile (bot protection), Resend (owner alerts +
   sending the diagnostic with the PDF attached). Without Resend, `approve-send`
   is disabled and alerts log to the console.

## How it works

- A visitor submits the application at `/[locale]/contact` → `POST /api/leads/submit`
  (Turnstile + per-IP rate limit) → inserts a `lead` → runs `generatePitchReport`
  after the response.
- `generatePitchReport` researches the brand with Claude + web search
  (`web_search_20260209`), writes a **teaser** diagnostic (names the risks and
  questions, resolves nothing), renders a PDF sharing the site's design tokens,
  uploads it to Storage, drafts a bilingual reply email, and flags the lead
  `pending_review`.
- Daley reviews at `/[locale]/admin` (Supabase Auth): preview the PDF, edit the
  reply, **regenerate** with instructions, or **approve & send** (the one
  irreversible action — emails the PDF via Resend).

## Notes

- Build in a non-synced local folder (not Google Drive) — `node_modules`/`.next`
  in a synced folder corrupts builds.
- PDF rendering uses full `puppeteer` locally and `puppeteer-core` +
  `@sparticuz/chromium` in production.
- Model: `claude-opus-4-8` with adaptive thinking. See `src/lib/generate-pitch.ts`.
