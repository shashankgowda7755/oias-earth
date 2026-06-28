## Why

A run of report + forest fixes shipped straight to production this session
(after the go-live data-persistence work). They had no spec of record. This
change documents them so the behaviour is captured and reviewable.

The problems addressed:

- **Report didn't reflect entered data.** Fields a user filled on the forest /
  report did not appear on the quarterly report: the assigned site manager
  (hard-coded `—`), the sponsor (blank when only the picker was used), the forest
  description, project site, forest business ID (`forest_unique_id`), the per-box
  planting layout, and dashboard images. Empty photo slots rendered as bare grey
  boxes.
- **Concurrent report editing lost work.** The report-data editor loaded the
  whole forest and saved the whole payload, so two people editing different
  sections of the same report overwrote each other (last save wins).
- **Cover layout.** The cover led with the sponsor/client name; the forest name
  and description were mis-weighted. Long text overflowed.
- **Image entry gaps.** The sponsor-logo row was paste-URL only; the report-data
  editor's Quarterly tab had no photo uploads at all (only the PFA field app did).
- **Brittle deploys.** A single failing/transient cold-start migration took the
  entire serverless function down (site-wide `FUNCTION_INVOCATION_FAILED`).

## What Changes

- **Report shows every entered field** (`app/server/src/lib/reportData.ts`,
  `app/client/src/pages/report/slides/*`): supervisor (from the assigned
  employee), sponsor name+logo (falls back to the linked sponsor when the rich
  logo block is empty), `forest_desc`, `project_site`, `forest_unique_id`,
  per-box species breakdown (`computed.site_plan_boxes`), dashboard images
  (cover-hero fallback + gallery).
- **Default dummy image** (`reportPrimitives.tsx`): every missing/broken photo
  renders a clear placeholder graphic instead of an empty box.
- **Cover redesign** (`slides/slides1.tsx`): no client/sponsor name on top;
  forest name is the bigger title (100%), description ~70% of it; both auto-fit
  to length so neither overflows.
- **Field-level autosave** (`reportForm/ReportDataEditor.tsx`): the editor saves
  only the columns the user actually edited (debounced, with save status +
  retry), so different sections no longer clobber each other.
- **Atomic per-item list edits** (`POST /forest/:id/report-data/list-item`):
  add/update/delete one item in a list column under a row lock — concurrent
  edits to the same list (gallery, maintenance, etc.) don't clobber.
- **Native image upload everywhere in the editor**: sponsor logo switched from
  paste-URL to the file uploader (new `sponsor_logo` slot); the Quarterly tab
  gained a per-quarter photo block (soil meter, inside/outside, progress,
  gallery) matching the PFA app.
- **Resilient cold-start migration** (`api/index.js`): each migration runs in
  its own try/catch — a failure is logged and skipped, the API still boots.

## Capabilities

### New Capabilities
- `quarterly-reporting`: the report-data editor autosaves per field, edits list
  items atomically, and accepts native per-quarter photo uploads.
- `deploy-reliability`: a single bad/transient cold-start migration cannot crash
  the serverless function.

### Modified Capabilities
- `proof-of-life`: the rendered report surfaces every entered field and never
  shows empty photo boxes; the cover leads with the forest name + description.
- `forest-geotagging`: editing a forest hydrates the full record and saves
  non-destructively; uploaded media is stored durably.

## Impact

- **Server**: `app/server/src/lib/reportData.ts` (supervisor, sponsor fallback,
  site_plan_boxes), `app/server/src/routes/forest.ts` (`GET /forest/:id`,
  non-destructive upsert, `report-data/list-item`, `sponsor_logo` slot),
  `app/server/src/routes/crud.ts` + `lib/storage.ts` (durable uploads),
  `app/server/src/routes/lists.ts` (`report_data` in reports list), `api/index.js`
  (resilient migrate).
- **Client**: `pages/report/slides/*`, `reportPrimitives.tsx`, `reportTypes.ts`,
  `reportCompute.ts` (report render + dummy image + cover), `pages/Forests/**`
  (edit hydration, wizard contract, sponsor upload), `reportForm/ReportDataEditor.tsx`
  + `sections/QuarterlyAutoSection.tsx` + `MediaSection.tsx` (autosave, per-quarter
  photos, native uploads), `lib/api.ts` + `forestApi.ts` (read-one + list-item helpers).

Status: shipped this session to `communitree` main and live on
communitree-rebuild.vercel.app. Retroactive spec of record.
