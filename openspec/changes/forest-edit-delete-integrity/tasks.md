# Tasks — forest-edit-delete-integrity

> Status: all items landed across commits 4ba249d (edit diff), 343ea5a and
> 0a04818 (delete FK order). Every line below is done.

## 1. Non-destructive grid/species diff on edit

- [x] 1.1 `forest.ts.upsertForest`: on update, stop deleting `gift_forest_plants`
  / `donor_trees` / `forest_trees` / `forest_boxes`; only clear + rebuild
  `forest_clusters` (a pure aggregate) inside the `rebuildBoxes` branch
  (`forest.ts:383`)
- [x] 1.2 `forest.ts.upsertForest`: branch on `isCreate` — create calls
  `generateBoxesAndTrees`, update calls `diffBoxesAndTrees` (`forest.ts:447`)
- [x] 1.3 `forest.ts`: add `diffBoxesAndTrees` — match existing boxes by
  `"row","column"` into `boxByRC`, UPDATE box scalars in place or INSERT a new
  box, track `seenBoxIds`
- [x] 1.4 `diffBoxesAndTrees`: per box, count active trees per species; when
  `want > have`, reactivate soft-deleted rows of that species first
  (`is_active = TRUE`), then INSERT only the remaining `need`
- [x] 1.5 `diffBoxesAndTrees`: when `want < have`, soft-delete surplus
  (`is_active = FALSE`) newest-first, restricted by the `NO_HISTORY` guard
- [x] 1.6 `diffBoxesAndTrees`: species dropped from the payload → soft-delete its
  active trees (history-free only); box dropped from the payload → soft-delete
  its trees, then retire the box only when it has no active trees left
- [x] 1.7 `diffBoxesAndTrees`: `NO_HISTORY` = no `forest_plant_timelines`, no
  `gift_forest_plants`, no `donor_trees`, no `forest_tree_carbon_ledger`, no
  `scene_hotspots` referencing the tree
- [x] 1.8 `diffBoxesAndTrees`: return boxes/trees/species/oxygen/carbon totals
  computed from `is_active = TRUE` rows only
- [x] 1.9 `AddForestWizard.tsx.buildForestValues`: send `box_data` whenever
  `configuredBoxes.length` (drop the `!f.id` create-only guard)

## 2. FK-safe forest delete cascade

- [x] 2.1 `crud.ts.genericDelete` (forests): detach `forest_plant_timeline_assets`,
  `forest_plant_timelines`, `scene_hotspots`, `forest_tree_activities`,
  `forest_tree_sponsors`, `tree_asserts` before `DELETE FROM forest_trees`
  (commit 343ea5a)
- [x] 2.2 `crud.ts.genericDelete` (forests): move `forest_tree_carbon_ledger`
  delete to run FIRST — it FKs `forest_trees`, `forest_plant_timelines` and
  `forests`, so it must go before the timelines it references
  (`crud.ts:545`, commit 0a04818)
- [x] 2.3 `crud.ts.genericDelete` (forests): delete `forest_trees`,
  `forest_boxes`, `forest_clusters`, `forest_sponsors`, `forests_employees`,
  `forests_reports`, then the forest row (`crud.ts:584`)

## 3. Verify

- [x] 3.1 Edit a forest's grid/species — only the diff is applied, existing trees
  and their timelines/geotags/gifts/donors/ledger survive
- [x] 3.2 Delete a forest whose trees have proof visits — completes with no FK
  500 and leaves no orphaned child rows
