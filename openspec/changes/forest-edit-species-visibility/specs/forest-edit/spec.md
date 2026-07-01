## ADDED Requirements

### Requirement: A forest's species are shown by name when it is opened for edit

Opening a forest for edit SHALL display the species that were planted, by their
real name and count, in the wizard's global Species Mix. The read-back MUST
resolve the species name from the catalog (`master_plantspecies` common_name /
species_name, falling back to the stored `forest_tree_name`) and MUST count only
active (`is_active = TRUE`) trees. The Species Mix MUST populate from a
forest-wide species summary so it works even for a forest that has trees but no
`forest_boxes` rows. A forest that genuinely has no captured species shows an
empty mix (not a fabricated one).

#### Scenario: Edit a forest that has species

- **WHEN** an admin opens the edit wizard for a forest planted with, say, 30
  Jackfruit and 50 Chimaivelvel
- **THEN** the Grid Config step's Species Mix lists "Jackfruit — 30" and
  "Chimaivelvel — 50" by name, and the total reads 80

#### Scenario: Edit a forest imported without box structure

- **WHEN** a bulk-imported forest has trees recorded but no box grid
- **THEN** the Species Mix still lists its species (from the forest-wide
  summary), not an empty "No species" state

### Requirement: Species entered on an existing forest are saved

Entering or changing species in the Quick-Entry Species Mix on an EXISTING
forest SHALL persist. Providing the total, the species mix and the grid config
MUST regenerate the planting so the change is submitted; the regeneration MUST
NOT clobber the boxes hydrated on open before the user makes a change, and the
save MUST go through the non-destructive diff so existing proof history is
preserved.

#### Scenario: Add a species while editing

- **WHEN** an admin opens an existing forest, sets the total + grid, adds a
  species to the Species Mix, and saves
- **THEN** reopening the forest shows that species (by name) with its count, and
  no previously proof-bearing tree was removed
