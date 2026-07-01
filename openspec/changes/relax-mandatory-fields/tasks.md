# Tasks — relax-mandatory-fields

> Status: shipped in commit 36804b1. Client-only validation relaxation; no server
> or DB change.

## 1. Relax Step 1 (basic) validation

- [x] 1.1 `validation.ts` `validateBasic`: keep `forest_name` and
  `forest_internal_id` required (core identity, dedup-safe) —
  `app/client/src/pages/Forests/validation.ts:61-62`
- [x] 1.2 Keep `forest_geo_lat` / `forest_geo_long` required and range-checked via
  `validLat` / `validLong` — `validation.ts:65-68`
- [x] 1.3 Drop the required checks for `forest_city`, `forest_state`,
  `forest_country`; leave `site_manager_id`, `user_id`, `sponsor_ids` optional —
  `validation.ts:70`

## 2. Relax Step 2 (grid) validation

- [x] 2.1 Add `optionalPositiveInt` (blank ok, typed value must be > 0 integer) —
  `validation.ts:31-34`
- [x] 2.2 Add `optionalNonNegativeNumber` (blank ok, typed value must be >= 0) —
  `validation.ts:44-47`
- [x] 2.3 `validateGrid`: run `optionalPositiveInt` over `box_rows`, `box_column`,
  `tree_row`, `tree_column`, `total_trees`, `project_period` —
  `validation.ts:79-85`
- [x] 2.4 `validateGrid`: run `optionalNonNegativeNumber` over
  `box_to_box_distance`, `tree_to_tree_distance`, `direction_angle`,
  `boundary_gap`, `pathway_spacing` — `validation.ts:87-94`
- [x] 2.5 Remove the required checks for `project_site` and `plantation_date`, and
  the conditional `client_code` / `forest_code` rule that fired when
  `total_trees > 0` — `validation.ts:96`

## 3. Remove misleading required markers in the UI

- [x] 3.1 `Steps.tsx` Step 1: drop `required` from City, State, Country, Site
  Manager, User, Sponsor
- [x] 3.2 `Steps.tsx` Step 2: drop `required` from Total Saplings, Client Code,
  Forest Code, and every Grid Configuration field (Box Rows/Column, Box-to-Box,
  Tree Rows/Column, Tree-to-Tree, Direction Angle, Boundary Gap, Pathway Spacing,
  Project Site, Project Period, Plantation Date)

## 4. Confirm gating opens without wizard edits

- [x] 4.1 Verify `AddForestWizard.tsx` `goNext` (line 223) and `handleSave`
  (line 233) still consume `validateStep` / `validateAll` unchanged — relaxed
  validators are enough to unblock Next and Save

## 5. Confirm out-of-scope surfaces are untouched

- [x] 5.1 Reports dialog `reportForms.ts` keeps `forest_id`, `year`, `quarter`
  required (structural report keys) — no change
- [x] 5.2 Server `routes/forest.ts` (~line 330) still requires lat/long on create
  — consistent with keeping location in the core; no server change
