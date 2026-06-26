> Status: implemented and pushed (live). Checked items reflect completed work;
> recorded here as the spec of record.

## 1. Climate auto-fill (Open-Meteo)

- [x] 1.1 `GET /forest/:id/weather?year=&quarter=` in `routes/forest.ts` — fiscal-quarter date range (end capped at today−5 for archive lag), Open-Meteo archive at lat/long → raining_days, rainfall_mm, dry_spell_days, outside temp avg/min/max, outside humidity avg
- [x] 1.2 Client `fetchForestWeather()` (`forestApi.ts`) + "⚡ Auto-fill weather" in the Quarterly form section → fills `maintenance_workforce.total_raining_days` + `temperature_humidity.outside_plantation.{temperature,humidity}`; inside readings stay manual

## 2. One-person quarterly form

- [x] 2.1 Split the report-data editor into `Site · enter once` + `⚡ Quarterly (auto)` groups (`reportForm/registry.tsx`, `ReportDataEditor.tsx`)
- [x] 2.2 New `QuarterlyAutoSection` — FY/quarter picker, weather auto-fill, inside temp/humidity + soil-pH inputs writing the per-quarter jsonb rows

## 3. PFA photo app + storage

- [x] 3.1 `POST /forest/:id/report-image` (multipart `photo` + `slot` [+ `year`,`quarter`]) → `putObject` (Vercel Blob) → `applyImageSlot` patches the matching forest field
- [x] 3.2 Slot whitelist: cover/content/impact/permission/layout/security/progress/soil_meter/temp_inside/temp_outside/earth/dashboard/gallery
- [x] 3.3 `/pfa` mobile-first page: forest picker, grouped tiles, live `getUserMedia` camera + file pick, preview→upload, progress, done summary; seeds existing photos
- [x] 3.4 Object storage wired (`BLOB_READ_WRITE_TOKEN`); `storage.ts` auto-detect Supabase→Blob→local

## 4. Multi-sponsor logos

- [x] 4.1 Cover (`slides1.tsx`) + Thank-you (`slides3.tsx`) render initiated-by + ALL sponsor entries, each captioned by `type.label`
- [x] 4.2 `POST /forest/:id/sponsor-logo` (logo file + title + name + value + index?) + `/delete`; upserts `additional_sponsor_logo`
- [x] 4.3 PFA "Sponsors & logos" editor — add/title/name/logo-upload/delete per row

## 5. Per-quarter photo gallery

- [x] 5.1 `021_gallery_images.sql` + `gallery_images` in forest upsert jsonb whitelist + exposed by `reportData.ts`
- [x] 5.2 `S21bGallery` slide (one photo per quarter, captioned, empty-safe) registered before Thank-You; Contents TOC updated; 23 slides total
- [x] 5.3 `gallery` slot + PFA per-quarter Gallery tile

## 6. Rendering integrity

- [x] 6.1 Soil pH / temp / humidity ≤0 render "—" (`pos()` guard, `slides3.tsx`)
- [x] 6.2 Site-Master-Plan total uses actual sapling counts (`reportCompute.ts`)
- [x] 6.3 Growth `target_height_range` clamped; broken/empty images fall back to placeholder

## 7. Recipient data

- [x] 7.1 `020_report_emails.sql`: `sponsor_email` + `forest_contact_email`; surfaced in sponsors/list + forest upsert (consumed by `resend-email-overhaul` CC)

## 8. Verification (done)

- [x] 8.1 tsc + build clean (client + server); deployed to prod
- [x] 8.2 Live: 3 uploads (cover / gallery Q1 / sponsor logo) → Blob URLs (HTTP 200) → render on the report; 4 logos on cover with custom titles; 23 slides; gallery slide shows the uploaded image
