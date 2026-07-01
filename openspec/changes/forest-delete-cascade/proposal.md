## Why

Deleting a forest (`POST /api/v1/forest/delete`, `genericDelete` forests branch
in `app/server/src/routes/crud.ts`) returned **HTTP 500** whenever any of its
trees carried history. The delete only detached `gift_forest_plants` and
`donor_trees` before `DELETE FROM forest_trees`, so the moment a tree had a
logged visit — a `forest_plant_timelines` row, i.e. proof-of-life — that foreign
key blocked the tree delete and the whole request failed.

Proof-of-life is the brand: a forest full of verified, visited trees is exactly
the forest an admin is most likely to have, and it was the one forest that could
not be deleted. Repro: create a forest with trees, log a visit
(`POST /forest/:id/trees/:treeId/visit` with a `timeline_date`), delete the
forest → 500.

## What Changes

- **Cascade-detach every child of `forest_trees(id)` in dependency order** before
  the tree delete, mirroring the existing gift/donor detach pattern:
  `forest_tree_carbon_ledger` → `forest_plant_timeline_assets` →
  `forest_plant_timelines` → `scene_hotspots` / `forest_tree_activities` /
  `forest_tree_sponsors` / `tree_asserts` → `gift_forest_plants` / `donor_trees`
  → `DELETE FROM forest_trees`.
- **Order gotcha (the key fix):** `forest_tree_carbon_ledger` FKs
  `forest_trees(tree_id)` **and** `forest_plant_timelines(timeline_id)` **and**
  `forests(forest_id)`, so it is deleted **first** — before the timelines it
  references — scoped by `forest_id OR tree_id OR timeline_id` so no row of any
  origin survives to block the delete. A first attempt that deleted timelines
  before the ledger still 500'd.
- No schema change. No `ON DELETE CASCADE` was added (migrations are append-only);
  the cascade is performed explicitly in the delete handler.

Status: **shipped + deployed to prod** (Vercel, Shashank account) on 2026-07-01,
`main` commits `343ea5a` (detach per-tree children) + `0a04818` (ledger-before-
timelines order fix). Verified live: forest with a proof-visit tree → DELETE 200
→ GET 404. Verified pre-deploy via a PGlite repro (old path reproduces the FK
500; new path deletes a forest-with-proof-timeline end-to-end). This change is
the retroactive spec of record.

## Capabilities

### New Capabilities
- `forest-lifecycle`: a forest can be deleted (or reversibly soft-deleted)
  together with all its dependent records — including trees that carry
  proof-of-life history — without a foreign-key failure.

## Impact

- **Server (edit)**: `app/server/src/routes/crud.ts` — `genericDelete` forests
  branch cascade-detaches all `forest_trees(id)` children in dependency order
  before the tree delete.
- **No schema / migration / client change.**
- **Residual (not fixed):** other `forests(id)` children still block a *hard*
  delete when present — `forest_scenes` (+ `scene_images` and scene-to-scene
  FKs), `forest_panoramas`, `user_role_forest_accesses`, `forest_asserts`,
  `sapling_stores`, and `reports.forest_id`. Only `forest_email_config`
  self-cascades (`ON DELETE CASCADE`). For a bulletproof delete regardless of
  attached records, use the reversible soft-delete path
  (`upsert { id, is_active: false }`), which already works. Tracked in tasks.
