# Tasks

## Shipped
- [x] `getForestFull` box species query: JOIN `master_plantspecies` for the name (common_name / species_name / fallback `forest_tree_name`) + `is_active = TRUE` filter (`routes/forest.ts`)
- [x] Boxes reconstruction uses `is_active IS NOT FALSE` (don't drop legacy NULL-active boxes)
- [x] `getForestFull` returns forest-wide `species_summary` (trees GROUP BY species, active, with names) — works even with zero boxes
- [x] Client `ForestFullRecord.species_summary` type + `ForestFullBox.species_data.species_common_name` (`lib/api.ts`)
- [x] `fullToForm` hydrates `species_mix` + `total_trees` from `species_summary` (fallback: per-box aggregation) (`Forests/index.tsx`)
- [x] Quick-Entry auto-fill (`Steps.tsx`) regenerates boxes from `species_mix` on edit; `skipAutoFill` ref skips only the initial hydration render so loaded boxes aren't clobbered
- [x] Verified live on prod: edit a forest → Grid Config shows Species Mix (Jackfruit 30, Chimaivelvel 50) by name, "80 / 80 assigned"; API `species_summary` returns names for Genpact (1500) and reconstructs for app-created forests

## Notes
- Bulk-imported forests with a cached `total_trees` but no `forest_trees` rows correctly show no species (none were ever captured) — the operator enters Total + Species Mix + Grid to materialise them.
- Depends on `nondestructive-forest-edit` (the diff) to make edit-time box regeneration safe.
