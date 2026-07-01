# Tasks

## Shipped
- [x] Detach all per-tree children of `forest_trees(id)` before the tree delete: `forest_plant_timeline_assets`, `forest_plant_timelines`, `scene_hotspots`, `forest_tree_activities`, `forest_tree_sponsors`, `tree_asserts` (mirrors existing gift/donor detach) — `343ea5a`
- [x] Delete `forest_tree_carbon_ledger` FIRST (before timelines), scoped by `forest_id OR tree_id OR timeline_id`, since it FKs all three — `0a04818`
- [x] PGlite repro proving the fix: old path reproduces the FK 500; new path deletes a forest-with-proof-timeline end-to-end (forest + timelines + ledger gone)
- [x] Deployed to prod (Vercel, Shashank account) 2026-07-01; verified live: forest with proof-visit tree → DELETE 200 → GET 404

## Pending / Residual (not yet fixed)
- [ ] Hard-delete still 500s when the forest has other `forests(id)` children present: `forest_scenes` (+ `scene_images`, scene-to-scene FKs), `forest_panoramas`, `user_role_forest_accesses`, `forest_asserts`, `sapling_stores`, `reports.forest_id`
- [ ] Decide the bulletproof path for go-live: either extend the cascade to the remaining `forests(id)` children, or route the admin "delete" action to reversible soft-delete (`upsert { id, is_active: false }`, already works) and reserve hard-delete for empty forests
