# Tasks — simplify-quarterly-reporting

> Status (2026-06-28): Q2-Q4 delta surface shipped. City-stats auto-fill shipped
> (Wikidata + Wikipedia, climate + soil_type). `lib/holidays.ts` shipped (5 Indian
> states). `/quarterly-session` skill created. `report-value-flow` blocked on
> operator Excel. Storage (Vercel Blob) live — image upload e2e not yet verified.

## 1. Guided entry point (kill raw JSON)

- [x] 1.1 `pages/Reports/index.tsx`: create now lands the operator on the guided editor (`/forest/:id/report-data?year=&quarter=`)
- [x] 1.2 Raw fields (`report_data` JSON, `mode`/`type`/`version`/`project_period`) moved behind an "Advanced" disclosure; JSON removed from the default path; sensible defaults (automatic/quarterly/v1)
- [ ] 1.3 Auto-create/update a lightweight `reports` index/status row when a quarter is started (currently uses the existing create flow)

## 2. Quarter-aware editor (Q1 full; Q2–Q4 delta)

- [ ] 2.1 `ReportDataEditor.tsx` reads `?year=&quarter=`; passes them to sections
- [x] 2.2 Q1: all sections shown (existing behaviour); structural fields pre-filled from forest creation
- [x] 2.3 Q2–Q4: nav collapses setup sections into "Setup (carried from Q1) ▸" disclosure; growth/soiltemp/media promoted to quarterly group
- [x] 2.4 Green banner above editor: "Q{n}: photos, workforce and growth change each quarter. Setup fields carried from Q1." with Show all ▸ toggle

## 3. Inline photo upload (reuse existing slots)

- [x] 3.1 `Img` adapter in `kit.tsx` wrapping `FileField` + `uploadReportImage(slot, file, {year,quarter})`; draft-authoritative (save overwrites column)
- [x] 3.2 Swapped `Url()` image fields for `Img` in MediaSection, SoilTempSection, AreaPopulationSection, LandAuthSection; URL paste kept as 503 fallback
- [ ] 3.3 Verify object storage (`storageReady()`) in prod (Vercel Blob)

## 4. Persisted, labelled weather

- [x] 4.1 `GET /forest/:id/weather?write=1` persists raining days + outside temp/humidity into the (year,quarter) JSONB; stamped `_weather`/`estimated`
- [x] 4.2 `QuarterlyAutoSection` stamps the patched values estimated (survive Save) + shows an "Estimated · Open-Meteo · overridable" badge

## 5. Maximal derivation

- [x] 5.1 `sundaysInQuarter()` in `reportData.ts` → weekly-off falls back to Sundays when not entered; `working_days` already computed
- [x] 5.2 `lib/holidays.ts` — festival calendar for TN/KA/MH/DL/GJ; `festivalHolidaysInQuarter(year, quarter, state)` + `getStateHolidays(state, year)` exported; re-exported from `reportData.ts`
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

## 9. City / area statistics auto-fill

- [x] 9.1 `GET /forest/city-stats?city=&state=&country=` — multi-source waterfall: Wikidata (P1082 population, P2046 area km², P1539 density) → Wikipedia REST summary extract; returns `region_name`, `total_jurisdiction_area`, `population`, `population_density`
- [x] 9.2 Climate detection from Wikipedia extract (tropical wet and dry / humid subtropical / semi-arid / tropical savanna / hot desert) → `climate` field
- [x] 9.3 Soil type detection from Wikipedia extract (alluvial / black soil / red soil / loamy / sandy) → `soil_type` field
- [x] 9.4 `AreaPopulationSection.tsx` — ⚡ Auto-fill from city name button; reads `forest_city/state/country`; fills region_name, area, population, density; manual override always available
- [x] 9.5 `CityStatsResult` interface in `forestApi.ts` updated with `climate` and `soil_type`
- [ ] 9.6 Census India API (`api.data.gov.in`) fallback for districts not well-covered by Wikidata
- [ ] 9.7 Wire `climate` + `soil_type` from city-stats fill into forest JSONB fields so report renders them on slide 3

## 10. Quarterly-session operator skill

- [x] 10.1 `.claude/skills/quarterly-session/SKILL.md` — 10-min operator session automation
  - Usage: `/quarterly-session <forest_id> <year> <Q1|Q2|Q3|Q4>`
  - Steps: navigate prod app → auto-fill weather + city stats → collect 7 manual delta values → fill fields → preview slides 15/16/17/20 → send
- [ ] 10.2 Wire `festivalHolidaysInQuarter` into `buildForestReport()` for `total_holidays_festival` auto-count (currently exported, not yet consumed)
- [ ] 10.3 Per-species growth curve table → auto-fill `plant_growth_data.target_height_range` (task 5.4)
