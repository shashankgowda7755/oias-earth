# Tasks

## Shipped
- [x] Client sends `box_data` on EDIT too (drop the `!f.id` create-only gate) — `AddForestWizard.tsx` `buildForestValues`
- [x] `diffBoxesAndTrees()` in `routes/forest.ts`: match boxes by `(row,column)`; add on count↑ (reactivate soft-deleted first, then insert with prefix-safe trailing-number continuation); soft-delete surplus on count↓
- [x] `NO_HISTORY` guard so surplus soft-delete never touches a tree referenced by `forest_plant_timelines` / `gift_forest_plants` / `donor_trees` / `forest_tree_carbon_ledger` / `scene_hotspots`
- [x] Update path calls `diffBoxesAndTrees` (UPDATE) vs `generateBoxesAndTrees` (CREATE); tree/box hard-DELETE removed from the update branch (only display clusters rebuilt)
- [x] Recompute `total_trees` / species / oxygen / carbon from `is_active = TRUE` trees after a diff
- [x] Forest delete (`genericDelete` forests branch, `routes/crud.ts`) cascade-detaches all per-tree child tables in FK order — carbon ledger (by forest_id / tree_id / timeline_id) before timeline assets + timelines
- [x] Verified live on prod: create 3 trees → log a proof visit on one → edit 3→1 (proof tree survives, 2 history-free soft-deleted) → edit 1→4 (reactivate + add); delete a forest whose tree has a proof timeline → 200, then 404

## Pending
- [ ] Bulletproof hard-delete for forests that also have 360-tour scenes / panoramas / sponsor-portal accesses / asserts / sapling_stores / reports rows (currently soft-delete `is_active = false` is the safe fallback)
- [ ] Surface soft-deactivated trees in an admin "removed this edit" affordance (audit visibility)
