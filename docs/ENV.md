# Environment variables

Set these in the Vercel project (Production + Preview). Never commit real values.

## Core (already set — live)
- `DATABASE_URL` — Neon Postgres connection string (pooler host).
- Auth signing secret(s) as used by `app/server/src/lib/auth`.

## Object storage (photos + 360 panoramas) — pick ONE backend
The server picks a backend via `app/server/src/lib/storage.ts`:
1. `STORAGE_BACKEND` (optional) — force `supabase` or `blob`.
2. else auto-detect: Supabase if its 3 vars are present, else Blob if its token is present.

**Supabase (the paid account):**
- `SUPABASE_URL` — e.g. `https://xxxx.supabase.co`
- `SUPABASE_SERVICE_KEY` — service-role key (server-only; never ship to client)
- `SUPABASE_BUCKET` — a **public** bucket name (e.g. `forest-media`)

**Vercel Blob (alternative):**
- `BLOB_READ_WRITE_TOKEN`

If neither is set, **every** upload — sponsor logos, employee + user avatars,
forest permission letters / site layouts, report photos — falls back to an
ephemeral `/uploads` path under `/tmp` that is **wiped on every cold start**, so
those images vanish after a redeploy. 360 image upload is rejected outright with
a clear message. For production you MUST set the Supabase (or Blob) vars above.

## Email (certificates / gifting)
- `RESEND_API_KEY` — Resend API key. Without it, certificate emails are skipped
  (the UI still generates the certificate + shareable link).

## Deploy
Deploys are **manual**: `npx vercel --prod --yes` from the repo root (a `git push`
to `main` does NOT auto-deploy unless Vercel↔GitHub git integration is connected).
