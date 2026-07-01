## Why

The Add/Edit Forest wizard hard-required roughly 22 fields across its two steps,
which did not match how operators actually onboard a forest:

1. **Onboarding blocked on data that arrives later.** `validateBasic` in
   `app/client/src/pages/Forests/validation.ts` required `forest_name`,
   `forest_internal_id`, `forest_city`, `forest_state`, `forest_country`, plus
   `forest_geo_lat` / `forest_geo_long`. `validateGrid` required `box_rows`,
   `box_column`, `box_to_box_distance`, `tree_row`, `tree_column`,
   `tree_to_tree_distance`, `direction_angle`, `boundary_gap`,
   `pathway_spacing`, `project_site`, `project_period`, `plantation_date`,
   `total_trees`, and conditionally `client_code` / `forest_code`. An operator
   who only knew the name, an internal ID, and a map pin could not get past
   Step 1, let alone save.
2. **`goNext` and `handleSave` are gated on those validators.** In
   `app/client/src/pages/Forests/AddForestWizard.tsx`, `goNext` (line 223) calls
   `validateStep` and refuses to advance if any error is returned; `handleSave`
   (line 233) calls `validateAll` and jumps back to the first invalid step with a
   toast. So every one of the 22 required fields was a hard wall on the Next and
   Save buttons.
3. **The `*` markers oversold what was mandatory.** `Steps.tsx` rendered
   `required` on City, State, Country, Site Manager, User, Sponsor, and the entire
   grid block, telling operators those fields were structurally required when the
   server does not need them.

## What Changes

- Relax `validateBasic` to require only the minimal safe core: `forest_name`,
  `forest_internal_id`, and the map location `forest_geo_lat` + `forest_geo_long`.
  `forest_city`, `forest_state`, `forest_country`, `site_manager_id`, `user_id`,
  and `sponsor_ids` become optional.
- Keep lat/long range-validated when present: `validLat` (-90..90) and `validLong`
  (-180..180) still run, so a typed-but-out-of-range coordinate is rejected. Blank
  coordinates are still blocked because the server rejects a create without them.
- Relax `validateGrid` so no Step-2 field is required. Every grid, project, and
  code field is optional. A value that IS typed is still format-checked via the new
  `optionalPositiveInt` / `optionalNonNegativeNumber` helpers (a typed grid count
  must be a positive integer, a typed distance/angle must be a non-negative
  number), but a blank never blocks Next or Save. The prior conditional rule that
  required `client_code` / `forest_code` once `total_trees` was set is removed.
- Remove the misleading `required` (`*`) markers from the now-optional fields in
  `Steps.tsx` (City, State, Country, Site Manager, User, Sponsor, Total Saplings,
  Client Code, Forest Code, and all Grid Configuration fields).
- Leave the separate Reports dialog untouched: `reportForms.ts` keeps
  `forest_id`, `year`, and `quarter` required because they are structural keys for
  a report, not descriptive forest attributes. This is out of scope for this
  change.
- No server change. `app/server/src/routes/forest.ts` (around line 330) still
  throws `badRequest('Forest needs a map location — set latitude & longitude.')`
  on a create without lat/long, which is exactly consistent with keeping location
  in the required core.

## Impact

- Client: `app/client/src/pages/Forests/validation.ts` (`validateBasic`,
  `validateGrid`, new `optionalPositiveInt` and `optionalNonNegativeNumber`
  helpers) and `app/client/src/pages/Forests/Steps.tsx` (removed `required`
  markers). `AddForestWizard.tsx` is unchanged — it already reads whatever the
  validators return, so relaxing the validators is enough to open `goNext` and
  `handleSave`.
- Server: no change. The lat/long guard in `routes/forest.ts` already matches the
  retained core requirement.
- DB: no migration. No column becomes nullable that was not already; this is a
  client-side validation relaxation only.
- Runtime: an operator can now save a forest with only name + internal ID + map
  location, and can advance/save with any subset of the optional fields blank.
  Typed-but-malformed values still surface a per-field format error.
- Out of scope: the Reports dialog (`reportForms.ts`) keeps its required
  structural keys, unchanged.
