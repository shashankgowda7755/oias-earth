# Go-Live Field & Storage Check — CGI / Forest Quarterly Report

**What this checks (corrected scope):** for every data point in the old report, can a user
(1) **enter** it in the form, (2) have it **stored** and survive on **every save path**, and
(3) see it **render** in the report. This is NOT about whether the new numbers equal the old PDF's
numbers — values differ by quarter/forest and that is expected.

Old report referenced: CGI Bangalore Q3 PDF. Live tested: `communitree-rebuild.vercel.app/report/forest/preview?src=cgiblr` (renders clean, 0 console errors, 23 slides).

---

## Decisions already taken (from you)
- **Quarter** — user picks the quarter; data taken for that quarter. Working as designed. Not an issue.
- **Site Manager** — user-entered field you handle. Not chasing it.
- **Species list** — you've started this separately. Left untouched here; noted only.
- Focus = **storage works everywhere, every field saved.**

---

## The real priority: storage must persist on EVERY path

There are 3 ways report data gets saved. A field is only safe if it survives the path used.

| Path | Used when | Code |
|---|---|---|
| A. Create wizard / JSON-import | new forest from the PDF→JSON skill | `POST /forest/upsert` → `FOREST_ALL_COLUMNS` allowlist (`forest.ts:101-168`) |
| B. Report-data editor | admin fills each section, hits "Save report data" | `POST /forest/:id/report-data` → `REPORT_UPDATE_JSONB` (`forest.ts:2115-2155`) |
| C. Per-image upload | uploading a photo to a slot | multer → object storage (`forest.ts` ~2640) |

### STORAGE BUGS (fix before go-live)

- **S1 · P0 — Photo Gallery silently lost on Save.**
  The report editor's *Species & media* tab has a **"Photo Gallery (Slide 22)"** input (`MediaSection.tsx:193-213`) writing `gallery_images`. But path B's allowlist `REPORT_UPDATE_JSONB` (`forest.ts:2121-2127`) **does not list `gallery_images`** — so on "Save report data" it is dropped. User enters 4 photos, saves, they vanish.
  **Fix:** add `'gallery_images'` to `REPORT_UPDATE_JSONB`.

- **S2 · P0 — Plantation grid lost on JSON-import.**
  PDF→JSON→create-forest sends plural keys `box_columns`, `tree_rows`, `tree_columns` (`fullTypes.ts:289-292`, `forestApi.ts`). DB columns are singular `box_column`, `tree_row`, `tree_column` (`forest.ts:116-119`); the allowlist drops the plurals (`forest.ts:254`). Result: matrix saved wrong → report shows "Per Matrix 1×1=1".
  **Fix:** map plural→singular in the client payload (or accept both in the server allowlist). The 2-step wizard already sends singular and is fine.

- **S3 · P0 — Image uploads fail (503) if storage env missing.**
  All photo slots (cover, gallery, meter, temperature, logos) upload to Vercel Blob or Supabase only when `BLOB_READ_WRITE_TOKEN` or `SUPABASE_*` is set; otherwise every upload returns HTTP 503 and saves nothing (`forest.ts:2834`, `lib/storage.ts`).
  **Fix:** confirm the storage env var is set in production. (Verify, not code.)

- **S4 · P1 — Permission letter / site layout files vanish on redeploy.**
  These two uploads go to `/tmp/uploads` on Vercel (`api/index.js:26-28`), which is wiped on every redeploy/cold start; the DB keeps a dead URL.
  **Fix:** route these to the same durable object storage as the other images.

- **S5 · minor — `forest_internal_id` dropped on save** (not in server scalar allowlist). Low impact.

### What round-trips correctly (good)
On path B these 17 sections save + read back cleanly: `land_ownership`, `land_area`, `authorization_details`, `area_population_statistics_details`, `direct_and_indirect_beneficiaries`, `forest_value_flow_impact_report`, `species_details`, `maintenance_workforce`, `plant_growth_data`, `soil_ph_level`, `temperature_humidity`, `environmental_need_indicators`, `security_and_infrastructure`, `plantation_progress`, `additional_sponsor_logo`, `dashboard_images`, `report_images`. Only `gallery_images` is missing (S1).

---

## Field-by-field: can it be entered + saved + rendered?

Legend: ✔ yes · ✗ no · — n/a. "Saved (editor)" = path B (the main field-entry screen).

| Data point | Input exists? | Saved (editor)? | Renders? | Note |
|---|---|---|---|---|
| Land ownership | ✔ (Land tab) | ✔ | ✔ | |
| Land area (sq ft) | ✔ | ✔ | ✔ | |
| DIGIPIN | ✔ | ✔ | ✔ | |
| Authorization (by/date/period/context) | ✔ | ✔ | ✔ | |
| Geo lat / long | ✔ wizard only | create path | ✔ | Set at forest creation, not editable in report editor |
| City / state / country | ✔ wizard only | create path | ✔ | Creation-time |
| Area, population, green cover, env need | ✔ (Area tab) | ✔ | ✔ | |
| Sub-region name ("West Bangalore") | **✗ no field** | — | ✗ | Minor field gap |
| Climate / soil / strategy / irrigation (+other) | ✔ (Site tab) | ✔ | ✔ | |
| Plantation date, project period, project site | ✔ | ✔ | ✔ | |
| Grid: box rows/cols, tree rows/cols, spacing | ✔ wizard | create path | ✔ | **S2 bug on JSON-import path** |
| Species (common/scientific/count per box) | ✔ wizard/box_data | create path | ⚠ | Renders; collapses if species_id empty (your separate species work) |
| Species traits (fruit/flower/nest/timber) | from species master | create path | ⚠ | Comes from master link, not a typed field |
| Saplings health / mortality / issues / scope | ✔ (Media tab) | ✔ | ✔ | |
| Beneficiaries: supervisor/watering/deweeding/plant-health | ✔ (Benef. tab) | ✔ | ✔ | |
| Beneficiaries: site manager | **✗ no field** | — | shows "—" | You handle this |
| Beneficiaries indirect (visiting/near/schools) | ✔ | ✔ | ✔ | |
| Maintenance (weekly off, festival, watering, rainy, gardeners, PT days) | ✔ (Maint. tab) | ✔ | ✔ | Outside temp/rain auto-fill from weather API |
| Workforce (shares maintenance fields) | ✔ | ✔ | ✔ | |
| Forest value: land/tree/oxygen/carbon (3/5/10y) | ✔ (Benef.&value tab) | ✔ | ✔ | All 12 inputs exist (`BeneficiariesValueSection.tsx:77-224`) |
| Environmental need indicators (repeatable) | ✔ (Media tab) | ✔ | ✔ | |
| Soil pH reading + date + meter image | ✔ (Soil/Temp tab) | ✔ | ✔ | |
| Soil pH: before-plantation value | **✗ no field** | — | chart only | Minor (chart is illustrative) |
| Temperature in/out + humidity + date + images | ✔ | ✔ | ✔ | |
| Plant growth target ranges + actual | ✔ (Growth tab) | ✔ | ✔ | Milestone *dates* auto-derived from plantation month |
| Photo gallery (4 photos) | ✔ (Media tab) | **✗ S1 dropped** | ✔ | **STORAGE BUG S1** |
| Sponsor logos / hero images / dashboard images | ✔ (Media tab) | ✔ | ✔ | |
| Security & infrastructure + photos | ✔ (Media tab) | ✔ | ✔ | |
| Plantation progress photos | ✔ (Media tab) | ✔ | ✔ | |
| Scorecard: SDG / GRI score | **✗ no field** | — | "—/100" | Real field gap — see below |
| Created-by name / phone, client name/logos | ✔ (report meta + sponsor logos) | ✔ | ✔ | Empty in this preview only |
| Contents page city label | static | — | ✗ | Hardcoded "Chennai" (render bug) |

---

## Field gaps to decide (no input exists today)
1. **Scorecard SDG + GRI scores** — no field, not stored, renders "—/100" (slide marked "later phase"). Add fields or hide the slide for go-live.
2. **Sub-region name** ("West Bangalore") — minor; add a text field on the Area section if wanted.
3. **Before-plantation pH** — minor; soil section stores one reading only.
4. **Contents "Chennai"** — not a field, a hardcoded label; should read the forest city.

(Per-row species entry + traits handled in your separate species work.)

---

## Security (separate, act now)
**Exposed GitHub token** in git remote `shashank`:
`https://ghp_…@github.com/shashankgowda7755/communitree-earth.git` = live push access for anyone reading the config.
**Fix:** rotate the token, then `git remote remove shashank` (re-add without the token if needed).

---

## Go-live checklist (storage-first)
- [x] S1 — `gallery_images` added to `REPORT_UPDATE_JSONB` (`forest.ts`)
- [x] S2 — plural grid keys aliased → singular in upsert (`GRID_KEY_ALIAS`, `forest.ts`)
- [ ] S3 — confirm `BLOB_READ_WRITE_TOKEN` / `SUPABASE_*` set in prod (**operational — you must verify**)
- [x] S4 — permission-letter / site-layout now uploaded via `putObject` (durable), local URL only as fallback
- [x] Region / sub-area name field added (form + schema + Contents/area/env render)
- [x] Before-plantation pH field added (form + schema + soil slide render)
- [x] Contents "Chennai" → forest city / region (now "West Bangalore" for CGI)
- [x] Scorecard — left as `—/100` per decision (no change)
- [ ] Rotate exposed GitHub token + `git remote remove shashank` (**you must do this**)

### Verified
- Client + server both build clean (`tsc` + `vite` pass).
- Preview render (`/report/forest/preview?src=cgiblr`): 0 console errors, all 23 slides; Contents + titles show "West Bangalore", soil shows "Before Plantation: 4 pH".

### Still to test on a real DB/prod (logic verified, needs running stack)
- S1 round-trip: enter gallery rows in report editor → Save → reload → persist.
- S2: create forest from PDF→JSON with grid keys → Site Master Plan "Per Matrix" correct.
- S4: upload doc → stored URL is blob/supabase, survives redeploy.
