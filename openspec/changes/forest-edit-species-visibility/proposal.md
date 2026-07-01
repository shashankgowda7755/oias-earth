## Why

Opening a forest for edit showed "No species" (or "Species #73") even when the
forest had species, and species entered in the redesigned "Quick Entry" wizard
were dropped on save. Four causes:

1. `getForestFull`'s box reconstruction returned species ids + counts only (no
   name → rendered "Species #73") and counted inactive trees.
2. The Quick-Entry step reads a GLOBAL `species_mix`, which the edit prefill
   (`fullToForm`) never populated — only the per-box `boxes[]` were hydrated.
3. Bulk-imported forests have a cached `total_trees` but no `forest_boxes` (and
   sometimes no `forest_trees`) rows, so box-based reconstruction was empty.
4. The Quick-Entry auto-fill that turns `species_mix` → boxes bailed on
   `isEdit`, so editing a forest produced no `box_data` and the save dropped the
   species.

## What Changes

- **Species names on read-back.** `getForestFull` JOINs `master_plantspecies`
  (common_name / species_name, fallback `forest_tree_name`) and filters
  `is_active = TRUE`; boxes use `is_active IS NOT FALSE` so legacy NULL-active
  boxes aren't dropped.
- **Forest-wide `species_summary`.** `getForestFull` also returns species totals
  straight from the trees (active, with names), so the mix populates even when a
  forest has no boxes.
- **Edit prefill hydrates the mix.** `fullToForm` builds `species_mix` +
  `total_trees` from `species_summary` (fallback: per-box aggregation).
- **Quick Entry regenerates on edit.** The `species_mix` → boxes auto-fill now
  runs on edit too — skipping only the initial hydration render so loaded boxes
  aren't clobbered on open. Safe because the save is a non-destructive diff (see
  `nondestructive-forest-edit`), so regenerating never erases tree history.

Status: shipped this session (main `fd716b7`, `cc5550f`, `7952bb4`, `a842b48`),
verified live — an edited forest shows "Jackfruit 30 / Chimaivelvel 50" with
"80 / 80 assigned". Retroactive spec of record.

## Capabilities

### Modified Capabilities
- `forest-edit` — species are visible by name on edit and persist when entered.
