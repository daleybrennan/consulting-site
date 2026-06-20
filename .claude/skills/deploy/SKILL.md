---
name: deploy
description: Deploy the consulting site to Vercel production and verify the live build, including the custom domain. Use when shipping changes to production, redeploying after an env-var change, or diagnosing why www.daleybrennan.com serves a stale build.
---

# Deploy to production

Ships the Next.js app to Vercel and confirms the change is actually live on the
custom domain — not just on the `*.vercel.app` alias. Working directory is the
repo root. The Vercel project is already linked (`.vercel/project.json`,
team `daley-s-projects`).

## TL;DR

```bash
git add -A && git commit -m "<message>"   # if there are code changes
npx vercel --prod                          # build + deploy to production
```

Then run **Verify** below. If the custom domain is stale, see **Custom-domain gotcha**.

## Critical: NEXT_PUBLIC_* must be NON-sensitive

`NEXT_PUBLIC_*` vars are inlined into the browser bundle **at build time**.
Vercel "Sensitive" vars are withheld during the build and come through as empty
strings — which silently breaks the client (e.g. the admin login shows
"Supabase isn't configured", and `new URL('')` can crash the build).

Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
`ADMIN_EMAIL`, `OWNER_EMAIL`, `TURNSTILE_SECRET_KEY`) **can** stay sensitive —
they're injected at runtime, not inlined.

Public vars that MUST be non-sensitive: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

To (re)create one correctly:
```bash
npx vercel env rm  <NAME> production --yes
npx vercel env add <NAME> production --no-sensitive --yes --value '<value>'
```
A var pulled empty when it shouldn't be is the tell:
```bash
npx vercel env pull .env.vercel.tmp --environment production && \
  grep -E '^NEXT_PUBLIC_' .env.vercel.tmp ; rm -f .env.vercel.tmp
```

## Verify (always run after deploy)

Confirm the **custom domain** serves the **same build** as the production alias,
and that a known public env value is inlined:

```bash
prod="https://consulting-site-psi-ten.vercel.app"   # *.vercel.app production alias
live="https://www.daleybrennan.com"                 # customer-facing domain
page="/en/admin"                                     # a page that uses NEXT_PUBLIC_SUPABASE_*

# Same set of JS chunks on both = same build live on the custom domain
diff <(curl -s "$prod$page" | grep -oE '/_next/static/[^"]+\.js' | sort -u) \
     <(curl -s "$live$page" | grep -oE '/_next/static/[^"]+\.js' | sort -u) \
  && echo "OK: custom domain on current build" \
  || echo "STALE: custom domain serving an older deployment (see gotcha)"

# NEXT_PUBLIC_SUPABASE_URL actually inlined (project ref should appear in a chunk)
curl -s "$live$page" | grep -oE '/_next/static/[^"]+\.js' | sort -u | while read c; do
  curl -s "$live$c" | grep -q "ubxrdqbclxwrwwgvpqyz" && echo "OK: Supabase URL inlined ($c)"
done
```

## Custom-domain gotcha

`www.daleybrennan.com` is an external (IONOS) domain. In this project it has
been observed **not** to follow CLI `vercel --prod` deploys — the `.vercel.app`
alias updates but the custom domain stays pinned to an older deployment, and
`vercel alias set` fails with "don't have access to the domain" (scope boundary).

Fixes, best first:
1. **Connect the Git repo for seamless deploys (recommended).** Vercel
   Dashboard → Project → Settings → Git → connect `daleybrennan/consulting-site`.
   After that, `git push` auto-builds and **updates all production domains
   together** — no CLI alias step. This is the durable "seamless" path.
2. **Dashboard reassign:** Deployments → latest *Ready* deployment → ⋯ →
   **Promote to Production** (assigns domains), or Settings → Domains → confirm
   `www.daleybrennan.com` + apex are set to serve **Production**.

Until the domain is fixed, the current build is always reachable at the
production alias (`consulting-site-psi-ten.vercel.app`).

## Notes
- Never set `NEXT_PUBLIC_SITE_URL` to an empty string — `layout.tsx` does
  `new URL(SITE_URL)` and an empty value fails the build. Use
  `https://www.daleybrennan.com` in production.
- PowerShell `echo "x" | vercel env add` stores an empty value — use the
  `--value` flag (or Bash `printf`) instead.
- Public site never shows pricing; that policy is unrelated to deploy but don't
  add env-driven price surfaces.
