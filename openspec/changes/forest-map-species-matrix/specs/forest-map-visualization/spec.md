## ADDED Requirements

### Requirement: Per-forest tree map renders a species matrix, not a point cloud

The per-forest tree map SHALL render a forest's saplings as a uniform planting
matrix on both `/forest/:id` and the `/map` per-forest drill-down —
a regular lattice of 10×10 "matrices" with real relative spacing (1 ft sapling
/ 2 ft matrix-gap / 10 ft pathway) — and SHALL NOT use a markercluster layer
that spiderfies dense, near-coincident planting points into an overlapping web.
The matrix MUST be uniformly scaled to fit and clipped to the forest's footprint
polygon, and both surfaces MUST share the same layout engine
(`matrixLayout.ts`).

#### Scenario: Drilling into a forest on the live map

- **WHEN** a user selects a forest on `/map`
- **THEN** its saplings render as the species matrix clipped to its footprint,
  and no markercluster spiderfy of raw GPS points is shown

#### Scenario: Opening a forest page

- **WHEN** a user opens `/forest/:id`
- **THEN** the mini-map renders the same species matrix produced by the shared
  `buildPlantingLayout` engine

### Requirement: Matrix is sized to the real sapling total

The matrix SHALL be sized to the forest's real sapling count — taken from
`report.computed.total_saplings`, falling back to `total_trees` — rather than to
a fixed footprint or to the number of geo-tagged trees. The point count MUST be
capped at 12,000 markers for render performance.

#### Scenario: A forest with a recorded planting total

- **WHEN** a forest has a `total_saplings` of N (N ≤ 12,000)
- **THEN** approximately N sapling points are laid within its footprint

#### Scenario: A very large planting

- **WHEN** a forest's sapling total exceeds 12,000
- **THEN** the rendered matrix is capped at 12,000 points and still reads as a
  filled planting

### Requirement: Saplings are coloured by species composition

Each sapling point SHALL be coloured by block-allocating species colours across
the matrix in proportion to each species' sapling count, drawn from
`report.computed.species_inventory` using the fixed `SPECIES_PALETTE`. A species
legend MUST show the sapling total and per-species counts, and any species name
interpolated into the legend HTML MUST be escaped.

#### Scenario: A multi-species forest

- **WHEN** a forest's inventory lists several species with sapling counts
- **THEN** contiguous regions of the matrix read as each species in proportion
  to its share, and the legend lists each species with its count

#### Scenario: A forest with no species inventory

- **WHEN** a forest has no recorded species inventory
- **THEN** the matrix renders in a single default sapling colour and no
  per-species legend rows are shown

### Requirement: Forests without a real boundary use a synthetic footprint

When a forest has no drawn boundary polygon, the map SHALL lay the matrix inside
a synthetic ~100 m square centred on the forest coordinate so the planting still
renders and fills the view. When a real boundary exists, the matrix MUST be
clipped to that polygon and the polygon MUST be drawn.

#### Scenario: Forest with a saved boundary

- **WHEN** a forest has a boundary of ≥3 points
- **THEN** the boundary polygon is drawn and the matrix is clipped inside it

#### Scenario: Forest with no boundary

- **WHEN** a forest has no boundary but has a coordinate
- **THEN** the matrix is laid inside a synthetic square around the centre and the
  view fits the matrix so it fills the map

### Requirement: Layout toggle and zoom-gated reveal on the forest page

The `/forest/:id` mini-map SHALL offer three pathway layouts — `aisle`, `grid`,
and `ring` — selectable via a toggle that rebuilds ONLY the sapling layer and
preserves the current zoom. Below `REVEAL_ZOOM` (17) the map MUST show only the
boundary outline; at or above it the saplings MUST be revealed with a fade-in.
The reveal gating applies only when a real boundary exists.

#### Scenario: Switching layout style

- **WHEN** the user selects a different pathway layout
- **THEN** only the sapling layer is rebuilt in that style, the map zoom is
  unchanged, and the new layer fades in

#### Scenario: Zooming in past the reveal threshold

- **WHEN** a forest with a real boundary is below `REVEAL_ZOOM` and the user
  zooms to at or above it
- **THEN** the saplings fade into view; below the threshold only the outline and
  a "Zoom in to reveal the saplings" hint are shown

### Requirement: Saplings render on a canvas layer

The sapling matrix SHALL be rendered on an `L.canvas` renderer (not individual
SVG/DOM markers) so that forests with up to 12,000 points pan and zoom smoothly.

#### Scenario: A 10k-sapling forest

- **WHEN** a forest with ~10,000 saplings is shown
- **THEN** the points are drawn on a single canvas renderer and the map stays
  interactive

### Requirement: Maps use a keyless satellite basemap

Both the live map and the per-forest map SHALL use a satellite basemap — Esri
World Imagery tiles with a CARTO `dark_only_labels` label overlay — without any
licensed/incumbent map API key, and MUST display the appropriate attribution.

#### Scenario: Loading either map

- **WHEN** `/map` or `/forest/:id` loads
- **THEN** Esri World Imagery satellite tiles render under a CARTO label overlay,
  attributed, with no Google Maps key used

### Requirement: Forest markers are survival-tinted ring-badge pins

A forest marker SHALL be a holder-style map pin (`.forest-logo-pin`): a white
circular badge holding the sponsor logo (or a lime fill when no logo), with a
pointer stem whose tip anchors to the coordinate. The badge ring colour MUST
reflect the forest's survival tier — lime when ≥90%, amber when 75–90%, orange
when below 75% — and a broken logo image MUST gracefully fall back to the lime
no-logo badge.

#### Scenario: A healthy sponsored forest

- **WHEN** a forest has a sponsor logo and survival ≥90%
- **THEN** its pin shows the logo in a white circle with a lime ring and a
  pointer stem

#### Scenario: An at-risk forest

- **WHEN** a forest's survival is below 75%
- **THEN** its pin ring and stem are tinted orange

#### Scenario: A missing or broken sponsor logo

- **WHEN** a forest has no sponsor logo, or the logo image fails to load
- **THEN** the pin renders as a lime no-logo badge rather than a broken image
