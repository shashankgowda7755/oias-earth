## ADDED Requirements

### Requirement: Editing a forest preserves existing trees and their history

Editing a forest's grid or species SHALL be applied as a non-destructive diff
against the trees that already exist. The system SHALL NOT delete and regenerate
the forest's trees on edit. Existing trees, their geotags, and their proof
history (`forest_plant_timelines`, `gift_forest_plants`, `donor_trees`,
`forest_tree_carbon_ledger`, `scene_hotspots`) SHALL survive an edit. A tree
that carries any such history SHALL never be removed or hidden by an edit; a
count reduction that cannot be satisfied from history-free trees SHALL leave the
count higher rather than hide proof.

#### Scenario: Increasing a species count adds only the new trees

- **WHEN** a forest is edited to raise a species count in a box from N to M
  (M greater than N)
- **THEN** the diff reactivates any soft-deleted trees of that species first and
  then inserts only the remaining new trees
- **AND** the N pre-existing trees keep their rows, geotags and history unchanged

#### Scenario: Decreasing a species count soft-deletes only history-free trees

- **WHEN** a forest is edited to lower a species count in a box, or a species or
  box is removed from the layout
- **THEN** the surplus trees are marked `is_active = FALSE` (not hard-deleted),
  newest first, and only trees with no timeline, gift, donor link, carbon-ledger
  row or tour hotspot are eligible
- **AND** a tree carrying any of that history stays active, so its proof is never
  hidden

#### Scenario: Grid edit reaches the diff path

- **WHEN** a user edits an existing forest's grid or species in the wizard and
  saves
- **THEN** the client sends `box_data` for the edit and the server routes the
  update through the diff (not the create-time regenerate), so the change
  persists without wiping tree history

#### Scenario: Totals reflect active trees only

- **WHEN** an edit reactivates, adds, or soft-deletes trees
- **THEN** the returned box, tree, species, oxygen and carbon totals are computed
  from `is_active = TRUE` rows only, matching every report and map query, so a
  soft-deleted tree drops out of all totals without its row being deleted

### Requirement: Forest delete removes all dependents in FK-safe order

Deleting a forest SHALL remove every per-tree and per-forest dependent row
before deleting the trees, boxes and the forest, in an order that respects all
foreign keys. The delete SHALL complete without a foreign-key error and SHALL
leave no orphaned child rows.

#### Scenario: Delete a forest whose trees have proof history

- **WHEN** a forest whose trees have proof timelines, timeline assets, a carbon
  ledger, tour hotspots, activities, sponsors or asserts is deleted
- **THEN** all of those child rows are detached first and the delete completes
  with no foreign-key 500 and no orphaned rows

#### Scenario: Carbon ledger is removed before the timelines it references

- **WHEN** the forest delete detaches per-tree child tables
- **THEN** `forest_tree_carbon_ledger` is deleted before `forest_plant_timelines`,
  because the ledger foreign-keys the timelines, so deleting timelines first
  would trip that foreign key
