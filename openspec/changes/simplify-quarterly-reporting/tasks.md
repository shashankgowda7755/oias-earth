# Tasks — simplify-quarterly-reporting

> Status: Q1 slice landed (typecheck + build green). `report-value-flow` is blocked
> on the operator's Excel. Storage backend (Vercel Blob) is reportedly live — verify
> before image-upload e2e. Q2–Q4 delta surface + live preview are the next slice.
> Coordinate storage + forest-save with the parallel audit/fix operation.

## 1. Guided entry point (kill raw JSON)

- [x] 1.1 `pages/Reports/index.tsx`: create now lands the operator on the guided editor (`/forest/:id/report-data?year=&quarter=`)
- [x] 1.2 Raw fields (`report_data` JSON, `mode`/`type`/`version`/`project_period`) moved behind an "Advanced" disclosure; JSON removed from the default path; sensible defaults (automatic/quarterly/v1)
- [ ] 1.3 Auto-create/update a lightweight `reports` index/status row when a quarter is started (currently uses the existing create flow)

## 2. Quarter-aware editor (Q1 full; Q2–Q4 delta)

- [ ] 2.1 `ReportDataEditor.tsx` reads `?year=&quarter=`; passes them to sections
- [x] 2.2 Q1: all sections shown (existing behaviour); structural fields pre-filled from forest creation
- [ ] 2.3 Q2–Q4: show only delta fields (photos, workforce contribution, growth) + auto weather + on-site; carried-forward setup read-only
- [ ] 2.4 Per-quarter banner stating what must be updated

## 3. Inline photo upload (reuse existing slots)

- [x] 3.1 `Img` adapter in `kit.tsx` wrapping `FileField` + `uploadReportImage(slot, file, {year,quarter})`; draft-authoritative (save overwrites column)
- [x] 3.2 Swapped `Url()` image fields for `Img` in MediaSection, SoilTempSection, AreaPopulationSection, LandAuthSection; URL paste kept as 503 fallback
- [ ] 3.3 Verify object storage (`storageReady()`) in prod (Vercel Blob)

## 4. Persisted, labelled weather

- [x] 4.1 `GET /forest/:id/weather?write=1` persists raining days + outside temp/humidity into the (year,quarter) JSONB; stamped `_weather`/`estimated`
- [x] 4.2 `QuarterlyAutoSection` stamps the patched values estimated (survive Save) + shows an "Estimated · Open-Meteo · overridable" badge

## 5. Maximal derivation

- [x] 5.1 `sundaysInQuarter()` in `reportData.ts` → weekly-off falls back to Sundays when not entered; `working_days` already computed
- [ ] 5.2 `lib/holidays.ts` (operator per-state festival calendar) → auto-count `total_holidays_festival`
- [x] 5.3 Species health/mortality from `forest_trees.tree_status_id` (`COUNT FILTER`) → `computed.derived_mortality_rate` / `derived_health` (overridable)
- [ ] 5.4 Growth targets from operator per-species growth curves → `plant_growth_data.target_height_range`
- [ ] 5.5 Carry-forward slow-changing fields into a new quarter's draft

## 6. Value-flow auto-compute (BLOCKED on operator Excel)

- [ ] 6.1 Receive + parse the operator's Excel formula table
- [ ] 6.2 Encode in `reportData.ts` or new `lib/valueFlow.ts`; decide replace-vs-fill
- [ ] 6.3 Populate value-flow + approximate-value; label estimated + overridable

## 7. Validation

- [x] 7.1 Server guard: duplicate (forest_id, year, quarter) → friendly `badRequest`
- [x] 7.2 Date ordering (plantation ≤ start ≤ end) in `validateReportForm`
- [x] 7.3 pH blank = unmeasured + range 0–14; humidity 0–100; temperature −20–60 (kit `Num` min/max)
- [ ] 7.4 Pre-send completeness nudge (missing cover/sponsor logo/quarter photos)

## 8. Quarter convention + verification

- [x] 8.1 Standardized on fiscal quarters; fixed stale calendar-quarter docs in `reportTypes.ts` + `reportForms.ts`
- [x] 8.2 `app/client` + `app/server` typecheck + build green; `graphify update .` done
- [ ] 8.3 Manual browser e2e (needs running stack + storage + a seeded forest)
