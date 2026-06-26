## Why

The per-forest map plotted every tree as a Leaflet markercluster that, at a
real planting's density, spiderfied into an unreadable web of numbered bubbles
and connector lines. It also differed between surfaces — `/map` (cluster) vs
`/forest/:id` — so the same forest looked different in two places. Forests with
no surveyed boundary had no plot context, and the boundary "draw" was tap-only
(no way to fix a misplaced corner).

The product needs ONE clean, consistent per-forest planting view, and a real
boundary editor so the plot can be traced and corrected on satellite.

## What Changes

- **Satellite basemap**: Esri World Imagery + reference labels (with a
  Street/Satellite/Labels toggle) on the geo maps, so plots are traced against
  real land.
- **Species matrix (unified per-forest tree view)**: saplings render as a
  uniform, real-dimensioned grid (sapling↔sapling 1 ft, matrix↔matrix 2 ft,
  ~100 saplings per matrix, ~10 ft pathways), **clipped to the forest boundary**
  polygon (or a synthetic square when no boundary is set), **coloured by the
  forest's species composition**, **sized to that forest's real sapling total**,
  canvas-rendered for 10k+ points, with a zoom-gated reveal. The SAME view now
  powers both `/map` (selected forest) and `/forest/:id` — the cluster/spider is
  retired. Three layout options (Aisle / Pathway grid / Ringed).
- **Restor.eco-style boundary editor** in the admin Geo-tagging tab: tap to add
  a vertex, **drag** a vertex to move, **click an edge** to insert a vertex,
  **double-tap** a vertex to delete, a live **area (ha) + perimeter (m)** readout,
  and **import KML/GeoJSON**. Saves a real lat/lng polygon to
  `forests.forest_boundary`; the matrix then clips to it.

Status: shipped this session (client commits incl. `d0772a6`, `aa05895`, plus
the boundary-editor work). This change is the retroactive spec of record.
NOTE: an "approximate" dashed-hexagon placeholder boundary for un-surveyed
forests is designed + user-approved but NOT yet implemented — tracked as a
pending task below.

## Capabilities

### New Capabilities
- `forest-tree-matrix`: a forest's saplings render as a uniform species-coloured
  grid clipped to its boundary, identical on the public map and the forest page,
  never a clustered/spiderfied scatter.

### Modified Capabilities
- `forest-geotagging`: the boundary is editable on an interactive satellite map
  (drag/insert/delete vertices, live area + perimeter, KML/GeoJSON import), not
  tap-and-save only.

## Impact

- **Client (new)**: `pages/Forests/matrixLayout.ts` (grid-in-polygon, species
  allocation, layouts), `pages/Forests/geoMeasure.ts` (area/perimeter, KML/
  GeoJSON parse).
- **Client (edit)**: `pages/Forests/TreeMap.tsx` (vertex editing), `GeoTagSection.tsx`
  (measurements + import), `pages/ForestPage.tsx` + `pages/PublicMap.tsx` (matrix
  render, satellite, unified per-forest view).
- No server/schema change (boundary persists via the existing
  `POST /forest/:id/boundary`).
