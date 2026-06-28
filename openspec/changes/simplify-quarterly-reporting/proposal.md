## Why

The quarterly forest report is the product we ship to sponsors, but creating one
still demands technical knowledge a non-technical operator should never need, and
it forces re-entry of data the system already has.

1. **Two disconnected surfaces.** The admin **Reports** tab (`pages/Reports/`)
   writes a thin `reports` row and exposes a **raw `report_data` JSON textarea**
   plus undocumented `mode` / `type` / `version` / `skip` fields — none of which
   the 23-slide renderer reads. The data the report actually renders lives in the
   forest **JSONB**, edited at a *different* URL (`/forest/:id/report-data`). An
   operator cannot tell which screen does what.
2. **The real operating model isn't reflected in the UI.** A forest is created
   once and that holds essentially all report data. **Q1 is the full report.**
   For **Q2–Q4 only a few things change** — photos, workforce contribution, and
   growth stage (weather auto-fills). Yet every quarter the operator is shown
   *every* field again, blank, and made to re-type or re-confirm all of it.
3. **Derivable data is still typed.** Weather is fetched but not persisted with
   provenance; weekly-off (Sundays), festival holidays, species health/mortality,
   growth targets, and the value-flow figures (land/tree/oxygen/carbon ₹) are all
   typed by hand even though the system (or operator-supplied reference tables)
   can compute them.
4. **Photos are paste-a-URL** in the inline editor even though slot-aware upload
   to object storage already exists (`POST /forest/:id/report-image`, used by the
   `/pfa` app).

## What Changes

- **One guided flow.** The Reports tab "Start / Open report" launches the
  quarter-aware report editor for a chosen forest + year + quarter. The raw
  metadata form (`report_data` textarea, `mode`/`type`/`version`/`skip`) moves
  behind an **Advanced** disclosure; the JSON textarea is removed from the default
  path. The `reports` row becomes a lightweight **index/status** record; forest
  JSONB stays the single source of truth the renderer reads.
- **Q1 = full report, Q2–Q4 = delta only.** The editor is driven by the selected
  quarter. **Q1** shows all sections (the one-time setup + quarterly). **Q2–Q4**
  show **only the fields that change** — photos, workforce contribution, growth
  stage — plus auto weather and on-site measurements; everything else is shown
  read-only as "carried forward from Q1". A clear banner states exactly what the
  operator must update this quarter.
- **Inline photo upload.** The inline editor's URL-paste image fields are replaced
  by a file/camera picker that uploads via the existing `POST
  /forest/:id/report-image` slots and writes the URL back into the draft
  (re-fetch + merge to avoid overwrite). URL paste remains as a fallback.
- **Persisted, labelled weather.** `GET /forest/:id/weather` gains a write path
  (`?write=1`) that persists raining days + outside temp/humidity into the
  (year, quarter) JSONB rows, stamped `_source:'open-meteo'` / `_estimated:true`
  so slides render an "Estimated" chip and the value stays overridable.
- **Maximal derivation.** Weekly-off (Sundays) auto-counted into
  `total_holidays_weekly_off`; `working_days` surfaced read-only; **festival
  holidays** auto-counted from an operator-supplied per-state calendar
  (`lib/holidays.ts`); **species health/mortality** derived from
  `forest_trees.tree_status_id`; **growth targets** auto-filled from
  operator-supplied per-species growth curves; **value-flow figures** computed
  from the operator's formula table (see below). All derived values are labelled
  and overridable — never presented as verified measurements.
- **Validation everywhere.** Duplicate (forest, year, quarter) blocked
  server-side; date sanity (plantation ≤ start ≤ end); pH blank = unmeasured
  (range 0–14), humidity 0–100, holiday counts ≤ days-in-quarter; a pre-send
  completeness nudge for missing cover/sponsor logo/quarter photos.
- **Quarter convention fix.** Standardize on **fiscal** quarters (Q1 Apr–Jun)
  everywhere; correct the stale calendar-quarter doc in `reportTypes.ts`.

## Capabilities

### New Capabilities
- `report-quarter-flow`: a single guided entry point per (forest, year, quarter);
  Q1 captures the full report, Q2–Q4 present only the changing fields with the
  rest carried forward read-only.
- `report-derivations`: derive weekly-off (Sundays), festival holidays (from an
  operator per-state calendar), species health/mortality (from tree status),
  and growth targets (from per-species curves) instead of asking — all labelled
  and overridable.
- `report-value-flow`: compute the value-flow figures (land value, tree value,
  oxygen generated, carbon sequestration across short/medium/long term) from the
  operator's formula table; pending the operator's Excel; replace-vs-fill decided
  on review.

### Modified Capabilities
- `climate-autofill`: weather can be **persisted** to the report JSONB with
  estimated provenance and rendered with an "Estimated" label, not just fetched.
- `report-photo-capture`: the inline report-data editor uploads photos to the
  existing report-image slots instead of pasting URLs.
- `report-rendering`: derived/estimated values render with an explicit label and
  remain operator-overridable; duplicate quarters cannot be created.

## Impact

- Client: `pages/Reports/index.tsx` (launch + Advanced), `ReportFormDialog.tsx`,
  `reportForms.ts`; `App.tsx` route; `pages/Forests/reportForm/` —
  `ReportDataEditor.tsx` (quarter-aware), `registry.tsx`, `kit.tsx` (new `Img`
  adapter), `sections/*` (URL→upload, delta filtering, carry-forward).
- Server: `lib/reportData.ts` (`sundaysInQuarter`, species health, value-flow,
  fiscal labels), `routes/forest.ts` (weather `?write=1`, duplicate guard),
  new `lib/holidays.ts`, possibly new `lib/valueFlow.ts`.
- DB (append-only, idempotent): optional `reports.status` + unique
  (forest_id, year, quarter) index if the index-row decision lands.
- Storage: reuses Vercel Blob (live) via `lib/storage.ts`; Supabase auto-preferred
  if its env vars are set.
- Renderer: 23 slides unchanged in count; weather/health/value-flow gain
  "Estimated" labels. `reports.report_data` remains unread (deprecated in-place).
- Sequencing: **Q1 ships first.** `report-value-flow` is gated on the operator's
  Excel. Coordinate storage + forest-save with the parallel audit/fix operation.
