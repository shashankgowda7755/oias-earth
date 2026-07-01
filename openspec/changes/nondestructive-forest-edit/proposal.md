## Why

Editing a forest silently dropped grid/species changes and risked destroying
living-proof data. The create wizard only sent `box_data` on CREATE
(`!f.id`), and on any grid change the server hard-deleted and rebuilt
`forest_trees` — which would wipe each tree's proof timeline, gifts, donor
links and carbon ledger. So the grid was effectively locked on edit, and the
operator's requirement — "any data entered anywhere in the forest module must
be captured" — was not met for grid + species counts.

Separately, deleting a forest whose trees carried a proof timeline returned
HTTP 500 on a foreign-key violation: the delete only detached gifts and donors
before removing `forest_trees`, leaving `forest_plant_timelines`,
`forest_tree_carbon_ledger`, tour hotspots and the other per-tree tables
pointing at rows about to vanish.

## What Changes

- **Grid/species edits are captured on edit.** The wizard now sends `box_data`
  on update too, not just on create (`buildForestValues`, `AddForestWizard.tsx`).
- **Non-destructive diff — no proof loss.** On update the server DIFFs the
  submitted grid instead of delete-and-rebuild (`diffBoxesAndTrees`,
  `routes/forest.ts`): boxes are matched by `(row, column)`; a species count
  increase reactivates previously soft-deleted trees first, then inserts new
  ones with prefix-safe numbering; a decrease or removal soft-deletes
  (`is_active = FALSE`) the surplus. A tree that carries ANY proof history — a
  plant timeline, gift, donor link, carbon-ledger row or 360-tour hotspot — is
  NEVER removed. Totals are recomputed from active trees; every report / map /
  count query already filters `is_active = TRUE`, so a soft-deleted tree drops
  out of all figures.
- **Safe forest delete.** Forest delete now cascade-detaches every per-tree
  child table in FK-dependency order — carbon ledger → timeline assets →
  timelines → gifts / donors / hotspots / activities / sponsors / asserts →
  trees — so deleting a forest whose trees have proof no longer 500s.

Status: shipped this session (main commits `4ba249d`, `343ea5a`, `0a04818`),
verified live on production. This change is the retroactive spec of record.

## Capabilities

### New Capabilities
- `forest-edit` — non-destructive grid/species editing and history-safe delete.
