# Tasks

## Report shows every entered field
- [x] `reportData.ts`: query the assigned employee → `meta.supervisor` (was hard-coded `—`)
- [x] `reportData.ts`: fall back to linked sponsors for `additional_sponsor_logo` when empty (sponsor name+logo always shows)
- [x] `reportData.ts`: build `computed.site_plan_boxes` (per-box species from forest_boxes ⋈ forest_trees)
- [x] `slides1.tsx`: render `forest_desc`, `project_site`, `forest_unique_id`; supervisor on OSR Land
- [x] `slides2.tsx`: "Box-wise Planting" block on Site Master Plan (capped, overflow-safe)
- [x] `slides3.tsx`: surface `dashboard_images` (cover-hero fallback + Photo Gallery)
- [x] `lists.ts`: add `report_data` to `reports/list` SELECT (edit form prefills on first open)

## Cover + default image
- [x] `reportPrimitives.tsx`: `ReportImage` renders a default dummy placeholder for missing/broken photos
- [x] `slides1.tsx`: drop client name from cover; forest name = bigger title, description ~70%; both auto-fit to length

## Editor: autosave + atomic list edits + native uploads
- [x] `ReportDataEditor.tsx`: field-level autosave (debounced, save status + retry, flush on leave) — only edited columns sent
- [x] `forest.ts`: `POST /forest/:id/report-data/list-item` (atomic add/update/delete under `SELECT … FOR UPDATE`)
- [x] `forestApi.ts`: `saveReportListItem()` helper
- [x] `forest.ts` + `MediaSection.tsx`: `sponsor_logo` slot; sponsor logo row uses the native `Img` uploader (was paste-URL)
- [x] `QuarterlyAutoSection.tsx`: per-quarter photo block (soil meter, inside/outside, progress, gallery) — PFA parity

## Forest edit: hydration + non-destructive + durable uploads
- [x] `forest.ts`: `GET /forest/:id` returns full record + sponsors/employees + reconstructed `box_data`
- [x] `index.tsx`/`AddForestWizard.tsx`: edit hydrates the full record; wizard payload aligned to the server contract (`box_data`/`column`/`species_data`, `employee_id`, `user_role_id`)
- [x] `forest.ts`: upsert UPDATE is non-destructive — child sections rebuilt only when supplied (protects trees/timelines)
- [x] `crud.ts` + `lib/storage.ts`: route sponsor/employee/user uploads through durable object storage (`storedUrl`)

## Deploy reliability
- [x] `api/index.js`: per-migration try/catch on cold start — one failure is logged + skipped, the API still boots

## Verify
- [x] Client + server typecheck and build pass
- [x] PGlite smoke: report payload returns supervisor/sponsor/site_plan_boxes/desc/site/id; autosave persists; per-item add/update/delete correct
- [x] Prod verified: all public routes 200, report renders end-to-end, console clean, migration crash no longer takes the API down
