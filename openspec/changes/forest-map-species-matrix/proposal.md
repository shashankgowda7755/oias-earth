## Why

Drilling into a single forest used to plot its raw GPS tree points on a
markercluster layer. Modeled plantings sit ~1 ft apart, so at max zoom the
cluster **spiderfied into an unreadable green web** of overlapping pins — it
neither communicated the real planting footprint nor the species mix, and it
fell apart entirely for 10k-sapling forests. The per-forest experience on both
`/forest/:id` (`ForestPage.tsx`) and the `/map` per-forest drill-down
(`PublicMap.tsx`) needed to read as an actual planted site, not a point cloud.

We also had two presentation gaps: forests with **no drawn boundary** had
nothing to anchor the layout to, and the maps used a flat basemap that gave no
ground-truth context for "is this really a forest".

## What Changes

- Add a unified **species-matrix layout engine** at
  `app/client/src/pages/Forests/matrixLayout.ts`
  (`buildPlantingLayout` / `gridInPolygon` / `gridRect` / `allocateSpecies` /
  `pointInPolygon` / `subsample` / `SPECIES_PALETTE`). It lays a forest's
  saplings as a uniform lattice of 10×10 "matrices" with real RELATIVE spacing
  (1 ft sapling / 2 ft matrix-gap / 10 ft pathway), uniformly **scaled to fit
  and CLIPPED to the boundary polygon**, sized to the forest's **real sapling
  total**, and **block-coloured by species composition**.
- **Replace the markercluster spiderfy** with this matrix on both per-forest
  surfaces: `ForestPage.tsx` and the `PublicMap.tsx` drill-down share the same
  engine. Rendered via **`L.canvas`** (capped at 12,000 points) so 10k+
  saplings stay smooth.
- Three selectable **pathway layouts** — `aisle` / `grid` / `ring` — with a
  toggle on `ForestPage` that rebuilds only the sapling layer (preserving zoom),
  a **zoom-gated reveal** (`REVEAL_ZOOM = 17`: outline-only below, fade-in
  saplings at/above), and a **species legend** keyed to the real inventory.
- **Synthetic-area placeholder**: a forest with no real boundary gets a
  synthetic ~100 m square around its centre so the matrix still renders and
  fills the view; a forest with a saved boundary clips to the real polygon.
- **Satellite basemap** across both maps: Esri World Imagery tiles + CARTO
  `dark_only_labels` overlay (keyless).
- **Ring-badge holder pin** for forest markers (`earth.css .forest-logo-pin`):
  white circle + sponsor logo (or lime fill), a **survival-tinted ring**
  (alive ≥90% lime / warn 75–90% amber / risk <75% orange) and a pointer stem
  whose tip anchors to the coordinate.

Status: already implemented and deployed. This change is the retroactive spec
of record.

## Capabilities

### New Capabilities
- `forest-map-visualization`: the per-forest tree map must render a forest's
  saplings as a species matrix clipped to its real (or synthetic) footprint,
  sized to the real sapling total, on a satellite basemap, instead of a
  markercluster point cloud that spiderfies into an unreadable web.

### Modified Capabilities
<!-- None — no existing spec's requirements change. -->

## Impact

- Client: `app/client/src/pages/Forests/matrixLayout.ts` (new layout engine),
  `app/client/src/pages/ForestPage.tsx` (matrix mini-map + layout toggle +
  zoom-gated reveal + legend), `app/client/src/pages/PublicMap.tsx`
  (per-forest drill-down = matrix, satellite basemap, ring-badge pin),
  `app/client/src/styles/earth.css` (`.forest-logo-pin`).
- Rendering: per-forest sapling points are drawn on an `L.canvas` renderer and
  capped at 12,000 markers; the matrix math is pure, keyless, degree-space
  (no projection, single-site scale).
- Data: layout is sized from `report.computed.total_saplings` (falling back to
  `total_trees`) and coloured from `report.computed.species_inventory`;
  boundary comes from `fetchForestBoundary`. No new API, database, or
  dependency changes.
- Tiles: Esri World Imagery + CARTO labels are third-party keyless basemaps
  (attribution shown); no incumbent Google Maps key is used.
