## Why

The quarterly forest report had three operational gaps. (1) Field/office staff
were **typing weather + maintenance numbers** that are derivable from the
forest's location and the calendar — error-prone and slow at 150 reports. (2)
There was **no way to attach the report photos** from a phone; image fields were
paste-a-URL only, and the only writable storage (`/uploads`) is ephemeral on
Vercel. (3) The report could show only the **first sponsor + first logo**, had
**no photo gallery**, and rendered **placeholder zeros** (soil pH "0", temp
"0°c / 0 RH") as if they were real readings, plus an inconsistent Site-Master-Plan
total and a growth typo.

## What Changes

- **Climate auto-fill.** New `GET /forest/:id/weather?year=&quarter=` derives the
  fiscal quarter's weather from **Open-Meteo** (free, no key) at the forest's
  lat/long: raining days, rainfall, outside temp/humidity, dry-spell. A
  "⚡ Auto-fill weather" button in the report form fills the outside readings +
  raining days; on-site (inside) readings stay manual.
- **One-person quarterly form.** The report-data editor is split into
  **Site · enter once** (config) and **⚡ Quarterly (auto)** (the few measured
  fields + weather auto-fill), so one person fills ~a handful of fields per
  quarter instead of every field every quarter.
- **PFA photo app.** New admin page `/pfa` (mobile-first): pick a forest →
  grouped photo tiles (Site-once + This-quarter) → take photo (live camera) or
  choose a file → preview → upload to **object storage (Vercel Blob)** →
  attaches the URL to the right report field. Server: `POST
  /forest/:id/report-image` (slot-aware: cover/content/impact/permission/layout/
  security/progress/soil_meter/temp_inside/temp_outside/earth/dashboard/gallery).
- **Multi-sponsor logos.** `additional_sponsor_logo[]` now renders **every**
  entry (unlimited sponsors, each with its own `type.label` title) plus the
  initiated-by logo on the cover + thank-you slides. New `POST
  /forest/:id/sponsor-logo` (+ `/delete`) uploads a logo and upserts the entry;
  the PFA has a "Sponsors & logos" editor (title + name + logo per row).
- **Per-quarter photo gallery.** New `gallery_images` jsonb column + a new
  "Photo Gallery" slide (one photo per quarter), added to the Contents TOC.
- **Rendering integrity.** Soil pH / temperature / humidity ≤ 0 render as "—"
  (a plantation is never 0°C / 0%RH; pH 0 is impossible); Site-Master-Plan total
  uses **actual** sapling counts (not projected grid capacity); growth ranges are
  clamped; broken/empty images fall back to a neutral placeholder.
- **Recipient data.** `sponsor_email` + `forest_contact_email` columns added
  (consumed by the Resend CC in `resend-email-overhaul`).

Status: **implemented and pushed (live).** This change is the retroactive spec
of record. Storage backend is Vercel Blob today; `lib/storage.ts` auto-prefers
Supabase if `SUPABASE_URL/SERVICE_KEY/BUCKET` are set later.

## Capabilities

### New Capabilities
- `climate-autofill`: derive a forest's quarterly weather (raining days,
  rainfall, outside temperature/humidity) from Open-Meteo by lat/long + fiscal
  quarter, and pre-fill the report's weather fields without manual entry.
- `report-photo-capture`: capture/upload report photos from a mobile app, store
  them in object storage, and attach each to a named report slot (incl.
  per-quarter slots) on the forest.

### Modified Capabilities
- `report-media`: the report renders ALL sponsor logos (each with its own
  title) + the initiated-by logo, and a per-quarter Photo Gallery slide.
- `report-rendering`: report slides are empty-safe — zero/sentinel readings show
  "—", computed totals match actual data, no misleading stock images.

## Impact

- Migrations: `020_report_emails.sql` (sponsor_email, forest_contact_email),
  `021_gallery_images.sql` (gallery_images jsonb).
- New routes: `GET /forest/:id/weather`, `POST /forest/:id/report-image`,
  `POST /forest/:id/sponsor-logo` (+ `/delete`). New client page `/pfa`.
- `forests` gains `gallery_images`; `additional_sponsor_logo` is now multi-entry
  with per-sponsor titles.
- Storage: `lib/storage.ts` (Vercel Blob via `BLOB_READ_WRITE_TOKEN`; Supabase
  fallback). New report slide count: 23 (Photo Gallery added before Thank-You).
- Note: two migrations share the `021_` prefix (`021_email_templates.sql` from
  `resend-email-overhaul` + `021_gallery_images.sql`); both are idempotent and
  run in filename order — rename one to `022_` on the next cleanup.
