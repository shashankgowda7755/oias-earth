## ADDED Requirements

### Requirement: Per-forest saplings render as a uniform species matrix clipped to the boundary

A forest's saplings SHALL render as a uniform grid ("matrix") of points laid
on real planting dimensions (sapling spacing, matrix grouping, pathways),
**clipped to the forest's boundary polygon** when one exists, or to a synthetic
square around the forest centre when it does not. Points MUST be coloured by the
forest's species composition and the count MUST reflect that forest's real
sapling total (capped only for render performance). The view MUST be rendered on
a canvas so it stays smooth for 10,000+ points, and MUST NOT use marker
clustering or spiderfication.

#### Scenario: A forest with a saved boundary

- **WHEN** a user opens a forest that has a saved boundary polygon
- **THEN** the saplings fill that polygon as an evenly-spaced species-coloured
  grid, and no point falls outside the outline

#### Scenario: A forest without a boundary

- **WHEN** a forest has no saved boundary
- **THEN** the matrix renders as a tidy square around the forest centre, sized to
  the sapling count, with the species legend — never a cluster of overlapping
  GPS pins

### Requirement: The per-forest tree view is identical on the public map and the forest page

The selected-forest tree view on `/map` and the view on `/forest/:id` SHALL be
the same species matrix. Selecting a forest on the public map MUST NOT show a
clustered/spiderfied marker layer.

#### Scenario: Drill into a forest from the public map

- **WHEN** a user selects a forest on `/map`
- **THEN** its saplings render as the same species matrix shown on that forest's
  page, with a species legend and the forest boundary outline
