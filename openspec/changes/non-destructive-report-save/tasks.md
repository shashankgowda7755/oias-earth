# Tasks — non-destructive-report-save

> Status: all fixes landed in commit d4fd5a0 and are on main. This document is
> retrospective; every item is done.

## 1. Client 3-way merge in the Report Data editor

- [x] 1.1 Add `LIST_COLS` set of keyed jsonb list columns
  (`ReportDataEditor.tsx:31`): `maintenance_workforce`, `soil_ph_level`,
  `temperature_humidity`, `plantation_progress`, `environmental_need_indicators`,
  `dashboard_images`, `report_images`, `gallery_images`
- [x] 1.2 Add `rowKey(it)` (`ReportDataEditor.tsx:36`) returning `yq:<year>-<quarter>`
  when `year`+`quarter` are set, else `st:<slide_type>`, else `null`
- [x] 1.3 Add `mergeList(baseline, draft, server)` (`ReportDataEditor.tsx:48`):
  start from the live server array, drop rows the operator deleted (in baseline,
  absent from draft), upsert the operator's adds/edits by key, preserve
  server rows unknown to this editor; fall back to draft when any row lacks a key
- [x] 1.4 Add `baselineRef` and set it on initial load alongside `draft`
  (`ReportDataEditor.tsx:76`, load effect ~`:80`)
- [x] 1.5 Rewrite `flush()` (`ReportDataEditor.tsx:94`): re-fetch live report only
  when a `LIST_COLS` column is pending, merge those columns, write others straight
  from the draft
- [x] 1.6 After a successful save, advance `baselineRef` and merge the saved
  columns back into `draft` so the next save diffs correctly
  (`ReportDataEditor.tsx:124`)

## 2. Server null-skip guard

- [x] 2.1 In `updateForestReportData` (`forest.ts:2481`) skip any jsonb column whose
  incoming value is `null`/`undefined` (`if (b[c] == null) continue;`,
  `forest.ts:2486`) instead of writing NULL
- [x] 2.2 Leave explicit clears to the atomic list-item endpoint
  `POST /forest/:id/report-data/list-item` (`forest.ts:3632`) — unchanged

## 3. Migration 027 import-only

- [x] 3.1 Change every forest insert in
  `app/db/migrations/027_bulk_import_180_sites.sql` from
  `ON CONFLICT (forest_internal_id) ... DO UPDATE SET forest_name/city/state/address
  = EXCLUDED...` to `... DO NOTHING`
- [x] 3.2 Keep the `WHERE forest_internal_id IS NOT NULL` partial-index predicate on
  each `ON CONFLICT`
- [x] 3.3 Leave the idempotent unique-constraint setup at the top of the migration
  intact so `ON CONFLICT` still resolves

## 4. Verify

- [x] 4.1 Confirm no remaining `DO UPDATE SET` in migration 027
- [x] 4.2 Committed as d4fd5a0 on main
