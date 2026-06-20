---
name: deploy
description: Deploy the consulting site to Vercel production and verify it live on www.daleybrennan.com. Use when shipping changes, after an env-var change, or diagnosing why the live site/admin is stale or shows "Supabase isn't configured".
---

# Deploy to production

Ships the Next.js app to Vercel and confirms it's live on `www.daleybrennan.com`.
Working directory is the repo root.

## ‼️ FIRST: deploy to the RIGHT project — there are TWO

There are two Vercel projects with near-identical names. Only one is real:

| | Scope | Serves www? | Use it? |
|---|---|---|---|
| ✅ REAL | **`daley-projects`** | **Yes** (Latest Production URL = www.daleybrennan.com) | **YES** |
| ❌ stray | `daley-s-projects` (note the extra `-s-`) | No (only `*.vercel.app`) | never — delete eventually |

The stray project caused a long debugging saga: CLI work landed on `daley-s-projects`
while `www` is served by `daley-projects`. **Always confirm you're on `daley-projects`.**

```bash
# Confirm the local repo is linked to the REAL project:
cat .vercel/project.json    # orgId must be the daley-projects team, name "consulting-site"
# If not, relink (needs a Vercel token for the daley-projects account):
export VERCEL_TOKEN="<token for daley-projects>"
npx vercel link --yes --scope daley-projects --project consulting-site
```
`daley-projects` is a separate Vercel **account** from `daley-s-projects`; the default
CLI login cannot see it. You need a token created in that account
(vercel.com → Account Settings → Tokens) exported as `VERCEL_TOKEN`.

## Deploy

```bash
export VERCEL_TOKEN="<daley-projects token>"
git add -A && git commit -m "<message>"   # if there are code changes
git push origin main                       # Git is connected → auto-deploys & aliases www
# OR force an immediate clean deploy from CLI (also aliases www on this project):
npx vercel --prod --force
```
A CLI `--prod` on the **daley-projects** project aliases straight to
`www.daleybrennan.com` (verified). `--force` skips build cache — use it after any
env-var change so `NEXT_PUBLIC_*` re-inline.

## ‼️ Env vars: NEXT_PUBLIC_* must be NON-sensitive, on ALL environments

`NEXT_PUBLIC_*` are inlined into the browser bundle **at build time**. If stored
"Sensitive" they come through **empty** → admin shows "Supabase isn't configured",
captcha doesn't enforce, `new URL('')` can crash the build. Also set them for
**all environments** (production, preview, development) — Git builds here have been
observed building in a non-Production context, so Production-only vars don't reach them.

Required (set with the helper below):
- non-sensitive: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_SITE_URL` (`https://www.daleybrennan.com`), `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- sensitive OK: `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `ANTHROPIC_API_KEY`,
  `ADMIN_EMAIL`, `OWNER_EMAIL`

```bash
export VERCEL_TOKEN="<daley-projects token>"
setvar() { # name value pub|sec
  for env in production preview development; do
    npx vercel env rm "$1" "$env" --yes >/dev/null 2>&1
    [ "$3" = pub ] \
      && npx vercel env add "$1" "$env" --no-sensitive --yes --value "$2" >/dev/null 2>&1 \
      || npx vercel env add "$1" "$env" --yes --value "$2" >/dev/null 2>&1
  done; echo "set $1"; }
# setvar NEXT_PUBLIC_SUPABASE_URL '<url>' pub   ... etc, then redeploy with --force
```
Audit: `npx vercel env pull .env.tmp --environment production && grep '^NEXT_PUBLIC_' .env.tmp; rm .env.tmp`
— every `NEXT_PUBLIC_*` must show a real value (not empty).

## Verify (always, against the customer domain)

```bash
base="https://www.daleybrennan.com"
# admin: real Supabase config inlined (not just the library's default string)
for c in $(curl -s "$base/en/admin?cb=$(date +%s%N)" | grep -oE '/_next/static/[^"]+\.js' | sort -u); do
  curl -s "$base$c" | grep -q "sb_publishable" && echo "admin OK (supabase inlined)" && break; done
# captcha enforced
curl -s -o /dev/null -w 'captcha POST=%{http_code} (want 400)\n' -X POST "$base/api/leads/submit" \
  -H 'Content-Type: application/json' \
  -d '{"locale":"en","contact_name":"Bot","contact_email":"b@e.com","company_name":"B","brand_category":"wine","stage":"pre_entry","free_text":"bot test here","consent":true,"turnstileToken":""}'
```

## Notes
- `.env.local` stays `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (local dev only); Vercel never reads it.
- Never set `NEXT_PUBLIC_SITE_URL` empty — `layout.tsx` does `new URL(SITE_URL)`.
- PowerShell `echo "x" | vercel env add` stores empty — always use `--value` (or Bash `printf`).
- The `consulting-site-psi-ten.vercel.app` alias belongs to the **stray** project; don't verify against it — use `www.daleybrennan.com`.
