> Status: implemented and deployed (live at communitree-rebuild.vercel.app).
> Checked items reflect completed work; recorded here as the spec of record.

## 1. Renderer shell + navigation

- [x] 1.1 Add `app/client/src/pages/report/ReportForestQuarterly.tsx` for routes `/report/forest/:id` and `/report/forest/preview`
- [x] 1.2 Render all 22 slides stacked, each in a `#rpt-slide-{i}` scroll anchor, reading `ForestReportData` (never recomputing)
- [x] 1.3 Sticky section navigator: prev/next buttons (disabled at ends) + jump-to-section `<select>` from `SLIDE_TITLES`, with `goTo` smooth-scroll and `cur+1 / total` counter
- [x] 1.4 Header shows client name · forest name · `Q{quarter} {year}`; surfaces a non-fatal `err` inline
- [x] 1.5 Gate the admin action menu (Back / Edit report data / Send report) behind a `localStorage` token + `Admin`/`SuperAdmin` role check — the route itself is public
- [x] 1.6 Loading + error states render plain (`Loading report…` / error text), never a blank crash

## 2. Slides + primitives

- [x] 2.1 Define the ordered 22-slide list + `SLIDE_TITLES` in `slides/index.tsx` (Cover … Thank You)
- [x] 2.2 Implement slides 1–7 (`slides1.tsx`), 8–14 (`slides2.tsx`), 15–22 (`slides3.tsx`)
- [x] 2.3 Add `reportPrimitives.tsx`: fixed `.rpt-slide` frame (1120×792), `REPORT_PRINT_CSS` (one landscape A4 page per slide, hide `.no-print`), palette `C`, and empty-safe formatters (`dash`, `kg`, `rupees`, `fmtDate`, `titleCase`) that return `—` for null/empty
- [x] 2.4 Approximate-value slide labels carbon/oxygen as "Estimated, verification-ready removal — not an issued carbon credit"

## 3. Client compute (`reportCompute.ts`)

- [x] 3.1 Pure `computeReport(payload, year, quarter)` + `buildMeta(...)` — no I/O, no React, so the rules can be mirrored server-side
- [x] 3.2 Fiscal quarters: `FQ_START_MONTH` (Q1=Apr … Q4=Jan next cal year), `daysInQuarter`, `quarterPeriodLabel`
- [x] 3.3 Species inventory from box/species counts; `num()` coerces missing/NaN to 0 so totals never inflate
- [x] 3.4 Maintenance + workforce rollups (quarter and till-date), growth milestones (height clamped ≤ 30 ft against data typos), current-height label, site master plan (prefer ACTUAL planted total over grid capacity)
- [x] 3.5 Value-flow net returns `null` when every term is absent (renders `—`, never `0`)

## 4. Server builder + endpoint

- [x] 4.1 Add `app/server/src/lib/reportData.ts#buildForestReport(forestId, year, quarter)` returning the same `{ meta, forest, computed }` shape
- [x] 4.2 Whitelist forest scalars (no PII/internal ids); parse-guard jsonb; map DB singular grid columns (`box_column`/`tree_row`/`tree_column`) to plural payload names
- [x] 4.3 Species inventory from `forest_trees ⋈ master_plantspecies`; oxygen/carbon = per-species per-day rate × 365 × count × 25% counted (estimated, never credit)
- [x] 4.4 Register `GET /api/v1/public/forest/:id/report?year=&quarter=` (`public.ts`); UUID-guard the id, default to the current calendar quarter when params omitted
- [x] 4.5 Add `POST /public/forest/:id/report-download` to log each PDF download to the audit trail (actor name or `anonymous`)

## 5. Report-data entry forms

- [x] 5.1 Add `reportForm/` editor (`ReportDataEditor.tsx`) with 8 section editors + a `⚡ Quarterly (auto)` section, ordered via `registry.tsx`
- [x] 5.2 Add `POST /forest/:id/report-data` (`forest.ts`) writing ONLY whitelisted report scalars + jsonb sections present in the body
- [x] 5.3 Guarantee the write path NEVER touches `forest_boxes`/`forest_trees` (so editing report data can never wipe geotagged trees); empty string → `NULL`, jsonb stringified
- [x] 5.4 Enforce `assertForestAccess` on the write

## 6. Client-side PDF download

- [x] 6.1 Add `reportDownload.ts#renderReportPdfBlob(onState?)`: await `document.fonts.ready`, html2canvas each `.rpt-slide` (scale 2, white bg), jsPDF one landscape A4 page per slide, return a Blob
- [x] 6.2 Add `downloadReportPdf(filename, onState?)` wrapping the blob into a one-click download; filename = `{forest} {Q} {year} Report.pdf` sanitised
- [x] 6.3 Dynamically import `html2canvas` + `jspdf` so they load only on click (no main-bundle bloat)
- [x] 6.4 Keep `window.print()` as a fallback Print button; abandon the serverless-Chromium route (Vercel `libnss3`)

## 7. Preview fixture

- [x] 7.1 Add `reportFixture.ts#buildPreviewReport(src)` building a report from bundled `vandalur.sample.json` (default) / `annasaheb` / `cgiblr` via `?src=`
- [x] 7.2 Empty fields render blank/`—` so any mapping mistake is visible in preview

## 8. Build, deploy, verify

- [x] 8.1 `tsc --noEmit` (client) and server typecheck pass
- [x] 8.2 `npm run build` bundles the renderer + lazy PDF chunks
- [x] 8.3 Deploy to Vercel production
- [x] 8.4 Verify live: `/report/forest/preview` renders all 22 slides; `GET /public/forest/:id/report` returns `{ data }`; Download produces a 22-page landscape PDF; editing report data leaves `forest_trees` untouched
- [x] 8.5 Confirm integrity rules on a real forest: carbon/oxygen read as estimated (never "credit"), and absent fields render `—` (never fabricated zeros)
