## Why

Sponsors and CSR partners need a quarterly forest report they can trust as a
**life record**, not a marketing certificate. The licensed incumbent ships a
hand-built 22-slide deck; we needed an original, clean-room renderer that pulls
the same fields from our own schema, computes the documented oxygen/carbon
method **as estimates** (never "credit"), and renders **blank where data is
absent** rather than fabricating zeros — because integrity is the brand.

Two structural constraints shaped the build:
- The report must never be able to corrupt the ground-truth record. Editing
  report data is a separate write path that **never touches `forest_trees`**
  (unlike `/forest/upsert`, which DELETEs + regenerates trees from `box_data`).
- A downloadable PDF must work for every browser with **no server**: the
  serverless-Chromium route hit Vercel's missing `libnss3`, so the PDF is
  assembled client-side from the live slide DOM.

Indian fiscal quarters apply throughout (Apr-start: **Q1 = Apr–Jun**, … Q4 =
Jan–Mar, whose months fall in the next calendar year).

## What Changes

- Add the **22-slide quarterly report renderer** at `/report/forest/:id` (and
  `/report/forest/preview`): `ReportForestQuarterly.tsx` shell with a sticky
  section navigator (prev/next + jump-to-section `<select>`), 22 slide
  components in `slides/slides1|2|3.tsx`, shared `reportPrimitives.tsx`, and a
  pure client compute module `reportCompute.ts`.
- Add the **server report builder** `app/server/src/lib/reportData.ts` and the
  public endpoint **`GET /api/v1/public/forest/:id/report?year=&quarter=`**
  (`public.ts`). It returns the exact `{ meta, forest, computed }` shape the
  renderer consumes — the renderer never recomputes, it only reads. Forest
  scalars are whitelisted (no PII/internal ids); jsonb is parse-guarded; the
  DB's singular grid columns map to the payload's plural names.
- Add **report-data entry forms** at `app/client/src/pages/Forests/reportForm/`
  (8 section editors + a quarterly-auto section, registered in `registry.tsx`)
  backed by **`POST /forest/:id/report-data`**, which writes only the report
  scalars + jsonb sections present in the body and **deliberately never touches
  `forest_boxes`/`forest_trees`**.
- Add **client-side PDF download** `reportDownload.ts`
  (`renderReportPdfBlob` + `downloadReportPdf`): html2canvas rasterises each
  fixed-size `.rpt-slide` (1120×792, A4-landscape ratio) and jsPDF assembles one
  landscape page per slide. Both libs are dynamically imported so they load only
  on click. Each download is logged fire-and-forget to the audit trail via
  `POST /public/forest/:id/report-download`.
- Add a **bundled-fixture preview** (`reportFixture.ts`) that builds a report
  from `vandalur.sample.json` (and other samples via `?src=`) so the field
  mapping can be verified slide-by-slide with no server/auth.

## Capabilities

### New Capabilities
- `report-generation`: the platform must generate a 22-slide quarterly forest
  report — viewable, navigable, and downloadable as a PDF — driven by a separate
  report-data write path that never mutates the tree record, with carbon/oxygen
  presented only as estimates and absent fields rendered blank.

### Modified Capabilities
<!-- None — no existing spec's requirements change. -->

## Impact

- Client: `app/client/src/pages/report/` — `ReportForestQuarterly.tsx`,
  `slides/{index.tsx,slides1.tsx,slides2.tsx,slides3.tsx}`,
  `reportPrimitives.tsx`, `reportCompute.ts`, `reportTypes.ts`,
  `reportFixture.ts`, `reportDownload.ts`, and bundled
  `vandalur.sample.json` / `annasaheb.sample.json` / `cgiblr.sample.json`.
  Report-data forms: `app/client/src/pages/Forests/reportForm/`
  (`ReportDataEditor.tsx`, `registry.tsx`, `kit.tsx`, `sections/*`).
- Server: `app/server/src/lib/reportData.ts` (new builder), `routes/public.ts`
  (`GET /public/forest/:id/report`, `POST /public/forest/:id/report-download`),
  `routes/forest.ts` (`POST /forest/:id/report-data`,
  `POST /forest/:id/send-report` viewer send-with-PDF).
- Data integrity: report-data writes are scoped to report scalars + jsonb only;
  `forest_trees`/`forest_boxes` are untouched. Carbon/oxygen are computed as
  "estimated / verification-ready removal" and never labelled "credit".
- Dependencies: `html2canvas` + `jspdf` (client, dynamically imported only).
- No database migrations; the report reads existing forest columns + jsonb.

Status: already implemented and deployed (live at
communitree-rebuild.vercel.app). This change is the retroactive spec of record.
