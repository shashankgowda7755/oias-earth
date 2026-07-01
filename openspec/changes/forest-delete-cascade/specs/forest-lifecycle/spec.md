## ADDED Requirements

### Requirement: Deleting a forest removes all its tree-level dependents

When a forest is hard-deleted, the system SHALL first detach every table that
foreign-keys `forest_trees(id)` — in dependency order — before deleting the
forest's trees, so that a forest whose trees carry proof-of-life history (logged
visits, photos, carbon ledger entries, tour hotspots) can be deleted without a
foreign-key failure. The delete MUST NOT return an error solely because a tree
has been visited or measured.

Because `forest_tree_carbon_ledger` references `forest_trees`,
`forest_plant_timelines`, AND `forests`, it MUST be deleted before the timelines
it points at, matching on any of `forest_id`, `tree_id`, or `timeline_id`, so no
ledger row of any origin survives to block the delete.

#### Scenario: Delete a forest whose tree has a logged visit

- **WHEN** an admin deletes a forest containing a tree that has at least one
  recorded visit (a `forest_plant_timelines` row)
- **THEN** the request succeeds (HTTP 200), the forest and its trees, timelines,
  timeline assets, and carbon-ledger rows are removed, and a subsequent read of
  the forest returns 404

#### Scenario: Carbon ledger cannot block the delete

- **WHEN** a forest's trees have carbon-ledger rows keyed by forest, by tree, or
  by timeline
- **THEN** all matching ledger rows are removed before the timelines and trees
  are deleted, and the delete does not fail on the ledger foreign key

### Requirement: A forest can be reversibly soft-deleted

The system SHALL support removing a forest from active use without a destructive
delete, by setting `is_active = false` via upsert. A soft-deleted forest SHALL be
excluded from active listings, maps, and totals (which already filter
`is_active = true`) and SHALL be restorable by setting `is_active = true` again.

#### Scenario: Soft-delete hides a forest from active surfaces

- **WHEN** an admin upserts a forest with `{ id, is_active: false }`
- **THEN** the forest no longer appears in active forest lists, the public map,
  or aggregate counts, while its rows (including proof-of-life history) remain
  intact for restore or audit
