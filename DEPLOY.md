# Deploying (free) to Vercel + pointing daleybrennan.com

This is a Next.js app (server API routes + i18n middleware), so it needs a host
that runs Next — not a static host. **Vercel's free Hobby tier** does this and
attaches custom domains for free.

> **Note on the free tier:** Vercel Hobby is for *non-commercial* use. Sharing a
> preview to gather opinions is fine. If this becomes your live, lead-generating
> business site, Vercel may expect the Pro plan (~$20/mo). Netlify's free tier is a
> fallback if you'd rather not upgrade.

The first deploy below is a **front-end preview**: every page works in English and
French and the contact form shows its success message, but submissions are **not**
emailed/stored and the AI pitch does not run (no keys configured). That's intentional
— zero cost, nothing to break. See the last section to switch it fully live later.

---

## 1. Put the code on GitHub

The project already has a git repo with one commit. Create an empty repo and push:

1. Go to <https://github.com/new>. Name it e.g. `commercial-diagnostic`, set it
   **Private**, and **do not** add a README/.gitignore/license (the repo already has
   them). Click **Create repository**.
2. In the project folder (`C:\Users\daley\dev\commercial-diagnostic`), run:

   ```bash
   git remote add origin https://github.com/<your-username>/commercial-diagnostic.git
   git push -u origin main
   ```

   A browser window opens to sign in to GitHub the first time (Git Credential
   Manager). After that the push completes.

   *(If you'd like, I can run these two commands for you once the repo exists — just
   paste me its URL.)*

## 2. Deploy on Vercel

1. Go to <https://vercel.com> and **Sign Up / Log in with GitHub** (free).
2. **Add New… → Project**, then **Import** the `commercial-diagnostic` repo.
3. Vercel auto-detects **Next.js** — leave all settings default, no environment
   variables needed. Click **Deploy**.
4. After ~1–2 minutes you get a live URL like
   `https://commercial-diagnostic-xxxx.vercel.app`. **Share that link with friends.**

Every future `git push` to `main` automatically redeploys.

## 3. Point www.daleybrennan.com at it (optional, free)

1. In your Vercel project: **Settings → Domains**.
2. Add `www.daleybrennan.com`. Also add `daleybrennan.com` and choose **Redirect to
   www** (or vice-versa — your preference).
3. Vercel shows the exact DNS records to create. At your domain registrar (wherever
   you bought daleybrennan.com), add what it lists — typically:

   | Host | Type | Value |
   |------|------|-------|
   | `www` | CNAME | `cname.vercel-dns.com` |
   | `@` (root) | A | `76.76.21.21` |

   Use whatever Vercel displays if it differs — it's authoritative.
4. Vercel provisions HTTPS automatically once DNS propagates (minutes to a few hours).
   The domain then serves the same site with a valid certificate.

---

## Later: switch from preview to fully live

When you're ready to accept real enquiries and generate pitch PDFs:

1. Create a free Supabase project, run `supabase/migrations/0001_init.sql`, and add an
   admin user (see `README.md`).
2. In Vercel: **Settings → Environment Variables**, add the keys documented in
   `.env.local.example` (`ANTHROPIC_API_KEY`, the three Supabase keys, `ADMIN_EMAIL`,
   and optionally Resend + Turnstile). Redeploy.
3. Optionally set `NEXT_PUBLIC_SITE_URL` to `https://www.daleybrennan.com` so
   canonical/OG/sitemap URLs match the live domain exactly.

That's the only difference between the preview and the full system — no code changes.
