## ADDED Requirements

### Requirement: Grid and species edits are captured on edit without destroying tree history

Editing a forest's planting grid or per-species counts SHALL persist. On update
the server MUST reconcile the submitted `box_data` against the stored planting
by DIFFING it, never by hard-deleting and rebuilding `forest_trees`. Boxes are
matched by `(row, column)`. A species count increase MUST add trees (reactivating
previously soft-deleted trees of that species first, then inserting new ones with
prefix-safe numbering). A count decrease, or removing a species or box, MUST
soft-delete (`is_active = FALSE`) only the surplus. A tree that carries any proof
history — a `forest_plant_timelines` row, `gift_forest_plants`, `donor_trees`,
`forest_tree_carbon_ledger` or `scene_hotspots` — MUST NEVER be removed or
deactivated by an edit. Forest totals (tree count, species, oxygen, carbon) MUST
be recomputed from `is_active = TRUE` trees after the diff.

#### Scenario: Increase a species count

- **WHEN** an admin opens a forest and raises a box's species count
- **THEN** the extra trees are added (reactivating soft-deleted rows first) and
  the forest's total tree count rises by exactly that amount

#### Scenario: Decrease a species count with a proof-bearing tree present

- **WHEN** a box has three trees of a species, one of which has a logged proof
  visit, and the admin lowers the count to one
- **THEN** two history-free trees are soft-deleted, the proof-bearing tree stays
  active with its timeline intact, and the total reflects one active tree

#### Scenario: Edit unrelated fields without touching the grid

- **WHEN** an admin edits only scalar fields (name, location, description) and
  the grid is unchanged
- **THEN** the diff is a no-op for trees — no tree is added, removed or
  deactivated, and all proof history is untouched

### Requirement: A forest whose trees carry proof can be deleted

Deleting a forest SHALL succeed even when its trees have proof history. The
delete MUST detach every table that foreign-keys `forest_trees` (and their
dependents) in dependency order — carbon ledger before the timelines it
references, timeline assets before timelines — so no foreign-key violation
occurs.

#### Scenario: Delete a forest that has a proof timeline

- **WHEN** a forest has a tree with a logged proof visit and an admin deletes the
  forest
- **THEN** the delete returns success (not a 500 foreign-key error) and the
  forest, its trees and their proof rows are all removed
