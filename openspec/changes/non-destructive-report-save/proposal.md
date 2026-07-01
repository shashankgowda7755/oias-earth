## Why

Three defects let a save that returned HTTP 200 silently erase report data that
had been written by another path. None threw an error, so an operator only found
out when a slide came back blank later:

1. **The Report Data editor whole-column-replaced from a stale snapshot.**
   `ReportDataEditor` (`app/client/src/pages/Forests/reportForm/ReportDataEditor.tsx`)
   loaded a forest once at mount into `draft`, then every debounced save POSTed the
   WHOLE jsonb column value from that snapshot. `updateForestReportData`
   (`app/server/src/routes/forest.ts`) replaced the column wholesale. Any row added
   AFTER the editor loaded — by the PFA uploader, or by the operator in another tab —
   was not in the snapshot, so the next section save overwrote it out of existence.
   HTTP 200, data gone.
2. **A null/empty column value could NULL-wipe stored data.**
   `updateForestReportData` wrote `null` when the incoming jsonb value was null:
   `vals.push(b[c] == null ? null : JSON.stringify(b[c]))`. A stale or empty draft
   that carried a null for a column would clear that column outright through the
   debounced path.
3. **Migration 027 reset ~107 bulk forests to seed values on every cold start.**
   `app/db/migrations/027_bulk_import_180_sites.sql` used
   `ON CONFLICT (forest_internal_id) ... DO UPDATE SET forest_name/forest_city/
   forest_state/forest_address = EXCLUDED....`. Migrations re-run on every cold
   start, so each restart reset the name, city, state and address of the
   bulk-imported forests back to the seed literals, wiping operator edits.

## What Changes

- **Client 3-way merge for keyed list columns.** `ReportDataEditor.flush()` now,
  when a keyed list column is pending, re-fetches the LIVE server report and
  3-way merges (baseline loaded state <-> current draft <-> live server) per column.
  Rows are matched by a stable `rowKey`: `(year,quarter)` or `slide_type`. The
  operator's own adds and edits upsert by key, their deletes drop rows, and rows
  present on the server but unknown to this editor are preserved. If any row lacks a
  stable key the merge falls back to the draft array (whole write). New helpers:
  `LIST_COLS`, `rowKey`, `mergeList`; new `baselineRef` that advances after each
  successful save; merged columns are written back into `draft`.
- **Server never NULL-wipes a jsonb column on the debounced path.**
  `updateForestReportData` now skips a column entirely when its incoming value is
  `null`/`undefined` (`if (b[c] == null) continue;`) instead of writing NULL.
  Explicit clears go through the atomic per-item list-item endpoint
  (`POST /forest/:id/report-data/list-item`).
- **Migration 027 is import-only.** Every forest insert changed from
  `ON CONFLICT (forest_internal_id) ... DO UPDATE SET ...` to
  `ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO NOTHING`,
  so re-running the migration on a cold start never overwrites an existing forest.

## Impact

- Client: `app/client/src/pages/Forests/reportForm/ReportDataEditor.tsx`
  (`LIST_COLS`, `rowKey`, `mergeList`, `baselineRef`, rewritten `flush()`).
- Server: `app/server/src/routes/forest.ts` (`updateForestReportData` null-skip
  guard, ~line 2486). No new endpoint; the existing list-item endpoint is unchanged.
- DB: `app/db/migrations/027_bulk_import_180_sites.sql`
  (all `DO UPDATE SET` -> `DO NOTHING`). No schema change; the unique index
  `uq_forests_internal_id` that backs `ON CONFLICT` is unchanged.
- Runtime: on a keyed-list save the client makes one extra GET (the live re-fetch)
  before the POST. Non-list columns and unkeyed lists take the original single write.
- Shipped in commit d4fd5a0 "fix(data-loss): stop report editor from erasing data
  saved elsewhere". This change documents behavior already on main.
