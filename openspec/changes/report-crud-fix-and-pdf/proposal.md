## Why

The admin **Reports** module could not create, edit, or delete reports: the
client called REST routes (`POST /report`, `PATCH /report/:id`,
`DELETE /report/:id`) that the server does not expose — the backend uses the
generic CRUD verbs `POST /report/upsert` + `POST /report/delete`. Every write
returned **404**, so "reports weren't getting generated." There was also no way
to open the rendered report from a row, and the quarterly report's "Download
PDF" only opened the browser print dialog (no real file on many setups).

## What Changes

- **Fix the Reports write path** (`pages/Reports/reportApi.ts`): create/update →
  `POST /report/upsert` (id in body = update); delete → `POST /report/delete`
  with `{ id, report_id }`. `report_data`/`skip` jsonb sent as objects (server
  stringifies).
- **"View report" row action**: the Reports row menu gains **View report ↗** →
  opens `/report/forest/:forest_id?year=&quarter=` (the rendered 22-slide report).
- **Real one-click PDF download** (`pages/report/reportDownload.ts`): render each
  fixed-size `.rpt-slide` to a canvas (html2canvas) and assemble a downloadable
  PDF (jsPDF) — no print dialog, works on every browser, no server (the
  serverless-Chromium route hit Vercel `libnss3` issues). Libs are dynamically
  imported so they don't bloat the main bundle.

Status: shipped this session (commit `d0772a6`). Verified live: old `/report`
returns 404, new `/report/upsert` returns 200; reports create/edit/delete from
the UI; View opens the report; Download produces a file. Retroactive spec of
record.

## Capabilities

### New Capabilities
- `quarterly-reporting`: admins can create, edit, delete, open, and download a
  forest's quarterly report from the Reports module.

## Impact

- **Client**: `pages/Reports/reportApi.ts` (upsert/delete verbs),
  `pages/Reports/index.tsx` (View-report row action),
  `pages/report/reportDownload.ts` (client PDF), `pages/report/ReportForestQuarterly.tsx`
  (Download wired to the client PDF).
- No server change — the `report` CRUD entity + `/report/upsert` `/report/delete`
  already existed; the client was calling the wrong paths.
