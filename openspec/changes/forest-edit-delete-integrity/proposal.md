## Why

Two defects in the forest lifecycle destroyed or blocked real data. Both went
through `upsertForest` / `genericDelete` and touched the same per-tree child
tables, so they are fixed together:

1. **Editing a forest's grid/species wiped the trees and all their history.**
   On update `upsertForest` (`app/server/src/routes/forest.ts`) ran the same
   path as create: when `box_data` was present it did `DELETE FROM forest_trees`
   / `DELETE FROM forest_boxes` (after detaching `gift_forest_plants` /
   `donor_trees`) and then called `generateBoxesAndTrees` to rebuild the whole
   grid from scratch. Every regenerated tree was a brand-new row, so the geotag,
   the `forest_plant_timelines` proof photos, the gifts, the donor links and the
   carbon ledger of the old trees were gone. Worse, the client
   (`AddForestWizard.tsx.buildForestValues`) only sent `box_data` on create
   (`!f.id && …`), so on edit the grid change usually did not persist at all —
   and when it did reach the server it took the destructive path.
2. **Deleting a forest 500'd and could leave orphans.** `genericDelete` for the
   `forests` table only detached `gift_forest_plants` and `donor_trees` before
   `DELETE FROM forest_trees`. Any tree that had accumulated proof history
   (`forest_plant_timelines` + `forest_plant_timeline_assets`,
   `forest_tree_carbon_ledger`, `scene_hotspots`, `forest_tree_activities`,
   `forest_tree_sponsors`, `tree_asserts`) still FK'd `forest_trees`, so the
   tree DELETE tripped those foreign keys and the request 500'd. A first pass
   that detached the extra tables still failed because
   `forest_tree_carbon_ledger` FKs `forest_plant_timelines`, so deleting the
   timelines before the ledger that references them tripped a second FK.

## What Changes

- Grid update is now a non-destructive diff. On edit `upsertForest` calls the
  new `diffBoxesAndTrees` instead of `generateBoxesAndTrees`; create still
  materialises fresh. The diff matches boxes by `(row, column)`, updates box
  scalars in place, adds trees when a species count rises (reactivating
  soft-deleted rows before inserting), and soft-deletes (`is_active = FALSE`) the
  surplus when a count falls or a species/box is dropped from the payload.
- Trees that carry proof or history are protected. Surplus soft-delete only
  touches trees with no `forest_plant_timelines`, no `gift_forest_plants`, no
  `donor_trees`, no `forest_tree_carbon_ledger` and no `scene_hotspots` row (the
  `NO_HISTORY` guard). A history-bearing tree is never hidden; if there are not
  enough history-free trees to remove, the count simply stays higher.
- Totals stay correct off `is_active = TRUE`. `diffBoxesAndTrees` computes
  boxes/trees/species/oxygen/carbon from active rows only, matching every
  existing count/report/map query, so a soft-deleted tree drops out of all
  totals without deleting its row.
- The client sends `box_data` on edit too. `buildForestValues` drops the `!f.id`
  guard so grid and species edits reach the server and hit the diff path.
- Forest delete detaches every per-tree child table in FK-safe order.
  `genericDelete` now deletes `forest_tree_carbon_ledger` first (it FKs
  `forest_trees`, `forest_plant_timelines` and `forests`), then
  `forest_plant_timeline_assets`, `forest_plant_timelines`, `scene_hotspots`,
  `forest_tree_activities`, `forest_tree_sponsors`, `tree_asserts`, then
  `forest_trees`, `forest_boxes`, `forest_clusters` and the forest join tables.

## Impact

- Server: `app/server/src/routes/forest.ts` — `upsertForest` update branch no
  longer deletes/rebuilds boxes+trees (only `forest_clusters`, a pure aggregate,
  is cleared and rebuilt); new `diffBoxesAndTrees` function (box match by
  `(row,column)`, species-count reconcile, `NO_HISTORY` guard, active-only
  totals). `app/server/src/routes/crud.ts` — `genericDelete` forest branch
  detaches all per-tree child tables in dependency order (carbon ledger first).
- Client: `app/client/src/pages/Forests/AddForestWizard.tsx` —
  `buildForestValues` sends `box_data` whenever boxes are configured (create and
  edit), not create-only.
- DB: no migration. Uses existing columns (`forest_trees.is_active`,
  `forest_boxes.is_active`) and existing FKs. Edit no longer hard-deletes
  `forest_trees` / `forest_boxes`; delete removes all dependents.
- Runtime: no new endpoints. Edit is heavier (per-box diff queries) but bounded
  by grid size. Delete does more DELETE statements but completes in one pass
  without an FK error.
